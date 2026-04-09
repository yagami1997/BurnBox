export async function createShare(env, request) {
  const token = randomToken();
  const tokenHash = await hashToken(token);
  const shareId = crypto.randomUUID();
  const expiresAt = request.expiresInHours === null
    ? "9999-12-31T23:59:59.999Z"
    : new Date(Date.now() + request.expiresInHours * 60 * 60 * 1000).toISOString();
  const maxDownloads = request.maxDownloads;
  const createdAt = new Date().toISOString();

  const file = await env.DB.prepare(
    `select id, filename from files where id = ? and deleted_at is null limit 1`,
  )
    .bind(request.fileId)
    .first();

  if (!file) {
    return null;
  }

  await env.DB.prepare(
    `insert into shares (id, file_id, token_hash, expires_at, max_downloads, download_count, revoked_at, created_at)
     values (?, ?, ?, ?, ?, 0, null, ?)`,
  )
    .bind(shareId, request.fileId, tokenHash, expiresAt, maxDownloads, createdAt)
    .run();

  return {
    id: shareId,
    fileId: request.fileId,
    expiresAt,
    maxDownloads,
    downloadCount: 0,
    token,
    filename: file.filename,
  };
}

export async function revokeShare(env, shareId) {
  const share = await env.DB.prepare(
    `select id, revoked_at from shares where id = ? limit 1`,
  )
    .bind(shareId)
    .first();

  if (!share) {
    return { status: "missing" };
  }
  if (share.revoked_at) {
    return { status: "already_revoked" };
  }

  const revokedAt = new Date().toISOString();
  const result = await env.DB.prepare(
    `update shares set revoked_at = ? where id = ? and revoked_at is null`,
  )
    .bind(revokedAt, shareId)
    .run();

  return result.meta.changes > 0 ? { status: "revoked" } : { status: "already_revoked" };
}

export async function resolveShareForDownload(env, token) {
  const tokenHash = await hashToken(token);
  const share = await env.DB.prepare(
    `select
        s.id,
        s.file_id,
        s.expires_at,
        s.max_downloads,
        s.download_count,
        s.revoked_at,
        f.filename,
        f.storage_key,
        f.content_type
      from shares s
      join files f on f.id = s.file_id
      where s.token_hash = ?
        and f.deleted_at is null
      limit 1`,
  )
    .bind(tokenHash)
    .first();

  if (!share) {
    return { status: "missing" };
  }

  const now = Date.now();
  if (share.revoked_at) {
    return { status: "revoked" };
  }
  if (Date.parse(share.expires_at) <= now) {
    return { status: "expired" };
  }
  const update = await env.DB.prepare(
    `update shares
      set download_count = download_count + 1
      where id = ?
        and revoked_at is null
        and expires_at > ?
        and (max_downloads is null or download_count < max_downloads)`,
  )
    .bind(share.id, new Date(now).toISOString())
    .run();

  if (update.meta.changes === 0) {
    return { status: "depleted" };
  }

  const object = await env.R2_BUCKET.get(share.storage_key);
  if (!object) {
    return { status: "missing_object" };
  }

  share.download_count += 1;

  return {
    status: "ready",
    share,
    object,
  };
}

export async function hashToken(token) {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return encodeBase64Url(new Uint8Array(digest));
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return encodeBase64Url(bytes);
}

function encodeBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
