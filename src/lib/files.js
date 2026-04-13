const CHUNK_SIZE = 5 * 1024 * 1024;
const MULTIPART_MIGRATION_ERROR = "The multipart upload migration has not been applied";

export async function createUploadPlan(env, input) {
  if (!env.DB) {
    throw new Error("D1 binding is required to create upload plans");
  }

  const fileId = crypto.randomUUID();
  const now = new Date();
  const createdAt = now.toISOString();
  const storageKey = buildStorageKey(now, fileId);
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
  const statements = [
    env.DB.prepare(
      `insert into upload_parts (file_id, part_number, etag, size, created_at)
       values (?, ?, ?, ?, ?)
       on conflict(file_id, part_number) do update set
         etag = excluded.etag,
         size = excluded.size,
         created_at = excluded.created_at`,
    )
      .bind(input.fileId, input.partNumber, etag, input.body.byteLength, updatedAt),
  ];

  if (input.partNumber === 1) {
    statements.push(
      env.DB.prepare(`update upload_plans set status = ?, updated_at = ? where file_id = ?`)
        .bind("uploading", updatedAt, input.fileId),
    );
  }

  await env.DB.batch(statements);

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

  let completedObject = null;
  try {
    try {
      completedObject = await completeMultipartUpload(env, {
        storageKey: uploadPlan.storage_key,
        multipartUploadId: uploadPlan.multipart_upload_id,
        parts,
      });
    } catch (error) {
      await safeAbortMultipartUpload(env, uploadPlan.storage_key, uploadPlan.multipart_upload_id);
      throw error;
    }

    const completedAt = new Date().toISOString();
    const tags = normalizeTags(input.tags);
    const objectSize = Number(completedObject?.size || uploadPlan.declared_size || 0);
    const contentType = completedObject?.httpMetadata?.contentType || uploadPlan.content_type || "application/octet-stream";
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
    if (completedObject) {
      await safeDeleteObject(env, uploadPlan.storage_key);
    }
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

export async function abortUploadPlan(env, fileId) {
  const uploadPlan = await getUploadPlan(env, fileId);
  if (!uploadPlan) {
    return { status: "missing" };
  }
  if (uploadPlan.completed_at || uploadPlan.status === "ready") {
    return { status: "already_completed" };
  }

  await safeAbortMultipartUpload(env, uploadPlan.storage_key, uploadPlan.multipart_upload_id);
  const updatedAt = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(`update upload_plans set status = ?, updated_at = ? where file_id = ?`)
      .bind("aborted", updatedAt, uploadPlan.file_id),
    env.DB.prepare(`delete from upload_parts where file_id = ?`)
      .bind(uploadPlan.file_id),
  ]);

  return {
    status: "aborted",
    fileId: uploadPlan.file_id,
    storageKey: uploadPlan.storage_key,
  };
}

export async function getUploadDiagnostics(env, fileId) {
  const uploadPlan = await getUploadPlan(env, fileId);
  if (!uploadPlan) {
    return null;
  }

  const [summaryResult, recentPartsResult] = await Promise.all([
    env.DB.prepare(
      `select
         count(*) as uploaded_parts,
         max(part_number) as last_confirmed_part,
         max(created_at) as last_part_recorded_at
       from upload_parts
       where file_id = ?`,
    )
      .bind(fileId)
      .first(),
    env.DB.prepare(
      `select part_number, size, created_at
       from upload_parts
       where file_id = ?
       order by part_number desc
       limit 3`,
    )
      .bind(fileId)
      .all(),
  ]);

  const totalParts = Math.max(
    1,
    Math.ceil(Number(uploadPlan.declared_size || 0) / Number(uploadPlan.chunk_size || CHUNK_SIZE)),
  );
  let uploadedParts = Number(summaryResult?.uploaded_parts || 0);
  let lastConfirmedPart = Number(summaryResult?.last_confirmed_part || 0);
  let lastPartRecordedAt = summaryResult?.last_part_recorded_at || uploadPlan.completed_at || null;
  if (uploadPlan.status === "ready" && uploadedParts === 0) {
    uploadedParts = totalParts;
    lastConfirmedPart = totalParts;
    lastPartRecordedAt = uploadPlan.completed_at || uploadPlan.updated_at || lastPartRecordedAt;
  }
  const recentParts = (recentPartsResult.results || [])
    .map((row) => ({
      partNumber: Number(row.part_number),
      size: Number(row.size || 0),
      recordedAt: row.created_at,
    }))
    .sort((left, right) => left.partNumber - right.partNumber);

  return {
    fileId: uploadPlan.file_id,
    status: uploadPlan.status,
    declaredSize: Number(uploadPlan.declared_size || 0),
    chunkSize: Number(uploadPlan.chunk_size || CHUNK_SIZE),
    totalParts,
    uploadedParts,
    lastConfirmedPart,
    lastPartRecordedAt,
    planUpdatedAt: uploadPlan.updated_at || uploadPlan.created_at || null,
    recentParts,
  };
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

function buildStorageKey(now, fileId) {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");

  return `archive/${year}/${month}/${fileId}`;
}

async function createMultipartUpload(env, storageKey, contentType) {
  const upload = await env.R2_BUCKET.createMultipartUpload(storageKey, {
    httpMetadata: {
      contentType: contentType || "application/octet-stream",
    },
  });
  if (!upload?.uploadId) {
    throw new Error("Multipart upload id was not returned by R2");
  }

  return upload.uploadId;
}

async function uploadMultipartPart(env, input) {
  const upload = env.R2_BUCKET.resumeMultipartUpload(input.storageKey, input.multipartUploadId);
  const uploadedPart = await upload.uploadPart(input.partNumber, input.body);
  const etag = uploadedPart?.etag;
  if (!etag) {
    throw new Error(`R2 did not return an ETag for part ${input.partNumber}`);
  }
  return etag;
}

async function completeMultipartUpload(env, input) {
  const upload = env.R2_BUCKET.resumeMultipartUpload(input.storageKey, input.multipartUploadId);
  return upload.complete(input.parts);
}

async function safeAbortMultipartUpload(env, storageKey, multipartUploadId) {
  try {
    const upload = env.R2_BUCKET.resumeMultipartUpload(storageKey, multipartUploadId);
    await upload.abort();
  } catch {
    // Ignore abort failures while cleaning up failed initialization.
  }
}

async function safeDeleteObject(env, storageKey) {
  try {
    await env.R2_BUCKET.delete(storageKey);
  } catch {
    // Ignore cleanup failures while preserving the original write error.
  }
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
