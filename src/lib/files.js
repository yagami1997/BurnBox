import { AwsClient } from "aws4fetch";

export async function createUploadPlan(env, input) {
  if (!env.DB) {
    throw new Error("D1 binding is required to create upload plans");
  }

  const fileId = crypto.randomUUID();
  const now = new Date();
  const storageKey = buildStorageKey(now, fileId, input.filename);
  const uploadUrl = await createPresignedUploadUrl(env, storageKey, input.contentType);
  const createdAt = now.toISOString();

  try {
    await env.DB.prepare(
      `insert into upload_plans (file_id, storage_key, filename, content_type, created_at, completed_at)
       values (?, ?, ?, ?, ?, null)`,
    )
      .bind(fileId, storageKey, input.filename, input.contentType, createdAt)
      .run();
  } catch (error) {
    if (String(error?.message || "").toLowerCase().includes("no such table")) {
      throw new Error("The upload_plans migration has not been applied");
    }
    throw error;
  }

  return {
    fileId,
    storageKey,
    uploadUrl,
    headers: {
      "Content-Type": input.contentType,
    },
  };
}

export async function completeUpload(env, input) {
  if (!env.DB) {
    throw new Error("D1 binding is required to complete uploads");
  }

  let uploadPlan;
  try {
    uploadPlan = await env.DB.prepare(
      `select file_id, storage_key, filename, content_type, completed_at
       from upload_plans
       where file_id = ?
       limit 1`,
    )
      .bind(input.fileId)
      .first();
  } catch (error) {
    if (String(error?.message || "").toLowerCase().includes("no such table")) {
      throw new Error("The upload_plans migration has not been applied");
    }
    throw error;
  }

  if (!uploadPlan || uploadPlan.completed_at) {
    throw new Error("Upload plan was not found or has already been completed");
  }

  const object = await waitForObject(env, uploadPlan.storage_key);
  if (!object) {
    throw new Error("Uploaded object was not found in R2");
  }

  const createdAt = new Date().toISOString();
  const tags = normalizeTags(input.tags);
  const objectSize = Number(object.size || 0);
  const contentType = object.httpMetadata?.contentType || uploadPlan.content_type || "application/octet-stream";
  const note = normalizeNote(input.note);

  await env.DB.batch([
    env.DB.prepare(
      `insert into files (id, filename, storage_key, size, content_type, tags_json, note, created_at, updated_at, deleted_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, null)`,
    )
      .bind(
        uploadPlan.file_id,
        uploadPlan.filename,
        uploadPlan.storage_key,
        objectSize,
        contentType,
        JSON.stringify(tags),
        note,
        createdAt,
        createdAt,
      ),
    env.DB.prepare(
      `update upload_plans set completed_at = ? where file_id = ?`,
    ).bind(createdAt, uploadPlan.file_id),
  ]);

  return {
    id: uploadPlan.file_id,
    filename: uploadPlan.filename,
    storageKey: uploadPlan.storage_key,
    size: objectSize,
    contentType,
    tags,
    note: note || "",
    createdAt,
  };
}

async function waitForObject(env, storageKey) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const object = await env.R2_BUCKET.head(storageKey);
    if (object) {
      return object;
    }

    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
  }

  return null;
}

export async function deleteFile(env, fileId) {
  const result = await env.DB.prepare(
    `select id, storage_key from files where id = ? and deleted_at is null limit 1`,
  )
    .bind(fileId)
    .first();

  if (!result) {
    return null;
  }

  await env.R2_BUCKET.delete(result.storage_key);
  const deletedAt = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(`update files set deleted_at = ?, updated_at = ? where id = ?`).bind(deletedAt, deletedAt, fileId),
    env.DB.prepare(`update shares set revoked_at = coalesce(revoked_at, ?) where file_id = ?`).bind(deletedAt, fileId),
  ]);

  return { id: result.id, storageKey: result.storage_key, deletedAt };
}

function buildStorageKey(now, fileId, filename) {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const safeFilename = filename
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || "file";

  return `archive/${year}/${month}/${fileId}-${safeFilename}`;
}

async function createPresignedUploadUrl(env, storageKey, contentType) {
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.R2_BUCKET_NAME || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
    throw new Error("R2 signing configuration is incomplete");
  }

  const client = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  });

  const url = new URL(
    `https://${env.R2_BUCKET_NAME}.${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${storageKey}`,
  );
  const signedRequest = await client.sign(
    new Request(url, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
      },
    }),
    {
      aws: {
        signQuery: true,
        expires: 300,
      },
    },
  );

  return signedRequest.url;
}

function normalizeTags(tags) {
  if (!tags) {
    return [];
  }

  if (Array.isArray(tags)) {
    return tags.map(String).map((tag) => tag.trim()).filter(Boolean);
  }

  return String(tags)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizeNote(note) {
  if (note === null || note === undefined) {
    return null;
  }

  const trimmed = String(note).trim();
  return trimmed ? trimmed : null;
}
