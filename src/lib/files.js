import { AwsClient } from "aws4fetch";

export async function createUploadPlan(env, input) {
  const fileId = crypto.randomUUID();
  const now = new Date();
  const storageKey = buildStorageKey(now, fileId, input.filename);
  const uploadUrl = await createPresignedUploadUrl(env, storageKey, input.contentType);

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
  const object = await waitForObject(env, input.storageKey);
  if (!object) {
    throw new Error("Uploaded object was not found in R2");
  }

  const createdAt = new Date().toISOString();
  const tags = normalizeTags(input.tags);
  await env.DB.prepare(
    `insert into files (id, filename, storage_key, size, content_type, tags_json, note, created_at, updated_at, deleted_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, null)`,
  )
    .bind(
      input.fileId,
      input.filename,
      input.storageKey,
      Number(input.size),
      input.contentType,
      JSON.stringify(tags),
      input.note || "",
      createdAt,
      createdAt,
    )
    .run();

  return {
    id: input.fileId,
    filename: input.filename,
    storageKey: input.storageKey,
    size: Number(input.size),
    contentType: input.contentType,
    tags,
    note: input.note || "",
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
