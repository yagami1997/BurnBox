import { AwsClient } from "aws4fetch";

const CHUNK_SIZE = 5 * 1024 * 1024;
const MULTIPART_MIGRATION_ERROR = "The multipart upload migration has not been applied";

export async function createUploadPlan(env, input) {
  if (!env.DB) {
    throw new Error("D1 binding is required to create upload plans");
  }

  const fileId = crypto.randomUUID();
  const now = new Date();
  const createdAt = now.toISOString();
  const storageKey = buildStorageKey(now, fileId, input.filename);
  const multipartUploadId = await createMultipartUpload(env, storageKey, input.contentType);
  const totalParts = Math.max(1, Math.ceil(Number(input.size || 0) / CHUNK_SIZE));

  try {
    await env.DB.prepare(
      `insert into upload_plans (
        file_id,
        storage_key,
        filename,
        content_type,
        declared_size,
        chunk_size,
        multipart_upload_id,
        status,
        created_at,
        updated_at,
        completed_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, null)`,
    )
      .bind(
        fileId,
        storageKey,
        input.filename,
        input.contentType,
        Number(input.size || 0),
        CHUNK_SIZE,
        multipartUploadId,
        "created",
        createdAt,
        createdAt,
      )
      .run();
  } catch (error) {
    if (isUploadPlanMigrationError(error)) {
      await safeAbortMultipartUpload(env, storageKey, multipartUploadId);
      throw new Error(MULTIPART_MIGRATION_ERROR);
    }
    throw error;
  }

  return {
    fileId,
    storageKey,
    mode: "multipart",
    chunkSize: CHUNK_SIZE,
    totalParts,
  };
}

export async function uploadFilePart(env, input) {
  const uploadPlan = await getUploadPlan(env, input.fileId);
  if (!uploadPlan || uploadPlan.completed_at) {
    throw new Error("Upload plan was not found or has already been completed");
  }

  if (!Number.isInteger(input.partNumber) || input.partNumber <= 0) {
    throw new Error("partNumber must be a positive integer");
  }

  const etag = await uploadMultipartPart(env, {
    storageKey: uploadPlan.storage_key,
    multipartUploadId: uploadPlan.multipart_upload_id,
    partNumber: input.partNumber,
    body: input.body,
    contentType: uploadPlan.content_type,
  });

  const updatedAt = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(
      `insert into upload_parts (file_id, part_number, etag, size, created_at)
       values (?, ?, ?, ?, ?)
       on conflict(file_id, part_number) do update set
         etag = excluded.etag,
         size = excluded.size,
         created_at = excluded.created_at`,
    )
      .bind(input.fileId, input.partNumber, etag, input.body.byteLength, updatedAt),
    env.DB.prepare(`update upload_plans set status = ?, updated_at = ? where file_id = ?`)
      .bind("uploading", updatedAt, input.fileId),
  ]);

  return {
    partNumber: input.partNumber,
    etag,
  };
}

export async function completeUpload(env, input) {
  if (!env.DB) {
    throw new Error("D1 binding is required to complete uploads");
  }

  const uploadPlan = await getUploadPlan(env, input.fileId);
  if (!uploadPlan || uploadPlan.completed_at) {
    throw new Error("Upload plan was not found or has already been completed");
  }

  const partsResult = await env.DB.prepare(
    `select part_number, etag
     from upload_parts
     where file_id = ?
     order by part_number asc`,
  )
    .bind(input.fileId)
    .all();

  const parts = (partsResult.results || []).map((row) => ({
    partNumber: Number(row.part_number),
    etag: row.etag,
  }));

  const expectedParts = Math.max(1, Math.ceil(Number(uploadPlan.declared_size || 0) / Number(uploadPlan.chunk_size || CHUNK_SIZE)));
  if (!parts.length || parts.length !== expectedParts || !hasContiguousParts(parts, expectedParts)) {
    throw new Error("Upload is incomplete");
  }

  const processingAt = new Date().toISOString();
  await env.DB.prepare(`update upload_plans set status = ?, updated_at = ? where file_id = ?`)
    .bind("processing", processingAt, input.fileId)
    .run();

  try {
    try {
      await completeMultipartUpload(env, {
        storageKey: uploadPlan.storage_key,
        multipartUploadId: uploadPlan.multipart_upload_id,
        parts,
      });
    } catch (error) {
      await safeAbortMultipartUpload(env, uploadPlan.storage_key, uploadPlan.multipart_upload_id);
      throw error;
    }

    const object = await waitForObject(env, uploadPlan.storage_key);
    if (!object) {
      throw new Error("Uploaded object was not found in R2");
    }

    const completedAt = new Date().toISOString();
    const tags = normalizeTags(input.tags);
    const objectSize = Number(object.size || uploadPlan.declared_size || 0);
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
          completedAt,
          completedAt,
        ),
      env.DB.prepare(
        `update upload_plans set status = ?, updated_at = ?, completed_at = ? where file_id = ?`,
      ).bind("ready", completedAt, completedAt, uploadPlan.file_id),
      env.DB.prepare(`delete from upload_parts where file_id = ?`).bind(uploadPlan.file_id),
    ]);

    return {
      id: uploadPlan.file_id,
      filename: uploadPlan.filename,
      storageKey: uploadPlan.storage_key,
      size: objectSize,
      contentType,
      tags,
      note: note || "",
      createdAt: completedAt,
    };
  } catch (error) {
    try {
      await env.DB.prepare(`update upload_plans set status = ?, updated_at = ? where file_id = ?`)
        .bind("failed", new Date().toISOString(), uploadPlan.file_id)
        .run();
    } catch {
      // Keep the original completion error.
    }
    throw error;
  }
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

  const deletedAt = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(`update files set deleted_at = ?, updated_at = ? where id = ?`).bind(deletedAt, deletedAt, fileId),
    env.DB.prepare(`update shares set revoked_at = coalesce(revoked_at, ?) where file_id = ?`).bind(deletedAt, fileId),
  ]);

  try {
    await env.R2_BUCKET.delete(result.storage_key);
  } catch (error) {
    const restoredAt = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare(`update files set deleted_at = null, updated_at = ? where id = ?`).bind(restoredAt, fileId),
      env.DB.prepare(`update shares set revoked_at = null where file_id = ? and revoked_at = ?`).bind(fileId, deletedAt),
    ]);
    throw error;
  }

  return { id: result.id, storageKey: result.storage_key, deletedAt };
}

async function getUploadPlan(env, fileId) {
  try {
    return await env.DB.prepare(
      `select
        file_id,
        storage_key,
        filename,
        content_type,
        declared_size,
        chunk_size,
        multipart_upload_id,
        status,
        created_at,
        updated_at,
        completed_at
       from upload_plans
       where file_id = ?
       limit 1`,
    )
      .bind(fileId)
      .first();
  } catch (error) {
    if (isUploadPlanMigrationError(error)) {
      throw new Error(MULTIPART_MIGRATION_ERROR);
    }
    throw error;
  }
}

async function waitForObject(env, storageKey) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const object = await env.R2_BUCKET.head(storageKey);
    if (object) {
      return object;
    }

    const delayMs = Math.min(400 * (attempt + 1), 2000);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return null;
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

async function createMultipartUpload(env, storageKey, contentType) {
  const client = createR2AwsClient(env);
  const url = createObjectUrl(env, storageKey);
  url.searchParams.set("uploads", "");

  const response = await client.fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": contentType || "application/octet-stream",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to initialize multipart upload (${response.status})`);
  }

  const xml = await response.text();
  const uploadId = extractXmlValue(xml, "UploadId");
  if (!uploadId) {
    throw new Error("Multipart upload id was not returned by R2");
  }

  return uploadId;
}

async function uploadMultipartPart(env, input) {
  const client = createR2AwsClient(env);
  const url = createObjectUrl(env, input.storageKey);
  url.searchParams.set("partNumber", String(input.partNumber));
  url.searchParams.set("uploadId", input.multipartUploadId);

  const response = await client.fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": input.contentType || "application/octet-stream",
    },
    body: input.body,
  });

  if (!response.ok) {
    throw new Error(`Failed to upload part ${input.partNumber} (${response.status})`);
  }

  const etag = response.headers.get("etag");
  if (!etag) {
    throw new Error(`R2 did not return an ETag for part ${input.partNumber}`);
  }

  return etag;
}

async function completeMultipartUpload(env, input) {
  const client = createR2AwsClient(env);
  const url = createObjectUrl(env, input.storageKey);
  url.searchParams.set("uploadId", input.multipartUploadId);

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<CompleteMultipartUpload>${input.parts
    .map(
      (part) => `<Part><PartNumber>${part.partNumber}</PartNumber><ETag>${escapeXml(part.etag)}</ETag></Part>`,
    )
    .join("")}</CompleteMultipartUpload>`;

  const response = await client.fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/xml",
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`Failed to complete multipart upload (${response.status})`);
  }
}

async function safeAbortMultipartUpload(env, storageKey, multipartUploadId) {
  try {
    const client = createR2AwsClient(env);
    const url = createObjectUrl(env, storageKey);
    url.searchParams.set("uploadId", multipartUploadId);
    await client.fetch(url, { method: "DELETE" });
  } catch {
    // Ignore abort failures while cleaning up failed initialization.
  }
}

function createR2AwsClient(env) {
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.R2_BUCKET_NAME || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
    throw new Error("R2 signing configuration is incomplete");
  }

  return new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  });
}

function createObjectUrl(env, storageKey) {
  return new URL(
    `https://${env.R2_BUCKET_NAME}.${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${storageKey}`,
  );
}

function extractXmlValue(xml, tagName) {
  const match = xml.match(new RegExp(`<${tagName}>([^<]+)</${tagName}>`));
  return match?.[1] || null;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function hasContiguousParts(parts, expectedParts) {
  if (parts.length !== expectedParts) {
    return false;
  }

  for (let index = 0; index < parts.length; index += 1) {
    if (parts[index].partNumber !== index + 1) {
      return false;
    }
  }

  return true;
}

function isUploadPlanMigrationError(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("no such table") || message.includes("no such column");
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
