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

  let publicHandle = "";
  let inserted = false;
  let lastError;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    publicHandle = randomPublicHandle();
    try {
      await env.DB.prepare(
        `insert into shares (id, file_id, token_hash, public_handle, expires_at, max_downloads, download_count, revoked_at, created_at)
         values (?, ?, ?, ?, ?, ?, 0, null, ?)`,
      )
        .bind(shareId, request.fileId, tokenHash, publicHandle, expiresAt, maxDownloads, createdAt)
        .run();
      inserted = true;
      break;
    } catch (error) {
      lastError = error;
      const message = String(error?.message || "").toLowerCase();
      if (message.includes("no column named public_handle")) {
        throw new Error("shares public_handle migration is not applied");
      }
      if (!message.includes("unique")) {
        throw error;
      }
    }
  }

  if (!inserted) {
    throw lastError || new Error("Failed to create share public handle");
  }

  return {
    id: shareId,
    fileId: request.fileId,
    expiresAt,
    maxDownloads,
    downloadCount: 0,
    token,
    publicHandle,
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

export async function resolveShareForView(env, token) {
  const share = await lookupShareByToken(env, token);
  if (!share) {
    return { status: "missing" };
  }

  return assessShareAvailability(share);
}

export async function resolveShareForViewByPublicHandle(env, publicHandle) {
  const share = await lookupShareByPublicHandle(env, publicHandle);
  if (!share) {
    return { status: "missing" };
  }

  return assessShareAvailability(share);
}

export async function resolveShareForDownload(env, token) {
  let share = await lookupShareByToken(env, token);
  if (!share) {
    return { status: "missing" };
  }

  const availability = assessShareAvailability(share);
  if (availability.status !== "ready") {
    return availability;
  }

  const now = Date.now();
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
    share = await lookupShareById(env, share.id);
    if (!share) {
      return { status: "missing" };
    }

    return assessShareAvailability(share, { fallbackUnavailable: true });
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

export async function resolveShareForDownloadByPublicHandle(env, publicHandle) {
  let share = await lookupShareByPublicHandle(env, publicHandle);
  if (!share) {
    return { status: "missing" };
  }

  const availability = assessShareAvailability(share);
  if (availability.status !== "ready") {
    return availability;
  }

  const now = Date.now();
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
    share = await lookupShareById(env, share.id);
    if (!share) {
      return { status: "missing" };
    }

    return assessShareAvailability(share, { fallbackUnavailable: true });
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

async function lookupShareByToken(env, token) {
  const tokenHash = await hashToken(token);
  return env.DB.prepare(
    `select
        s.id,
        s.file_id,
        s.public_handle,
        s.expires_at,
        s.max_downloads,
        s.download_count,
        s.revoked_at,
        f.filename,
        f.storage_key,
        f.content_type,
        f.size
      from shares s
      join files f on f.id = s.file_id
      where s.token_hash = ?
        and f.deleted_at is null
      limit 1`,
  )
    .bind(tokenHash)
    .first();
}

async function lookupShareById(env, shareId) {
  return env.DB.prepare(
    `select
        s.id,
        s.file_id,
        s.public_handle,
        s.expires_at,
        s.max_downloads,
        s.download_count,
        s.revoked_at,
        f.filename,
        f.storage_key,
        f.content_type,
        f.size
      from shares s
      join files f on f.id = s.file_id
      where s.id = ?
        and f.deleted_at is null
      limit 1`,
  )
    .bind(shareId)
    .first();
}

async function lookupShareByPublicHandle(env, publicHandle) {
  return env.DB.prepare(
    `select
        s.id,
        s.file_id,
        s.public_handle,
        s.expires_at,
        s.max_downloads,
        s.download_count,
        s.revoked_at,
        f.filename,
        f.storage_key,
        f.content_type,
        f.size
      from shares s
      join files f on f.id = s.file_id
      where s.public_handle = ?
        and f.deleted_at is null
      limit 1`,
  )
    .bind(publicHandle)
    .first();
}

function assessShareAvailability(share, options = {}) {
  const now = Date.now();
  if (share.revoked_at) {
    return { status: "revoked" };
  }
  if (Date.parse(share.expires_at) <= now) {
    return { status: "expired" };
  }
  if (share.max_downloads !== null && share.download_count >= share.max_downloads) {
    return { status: "depleted" };
  }
  if (options.fallbackUnavailable) {
    return { status: "unavailable" };
  }

  return { status: "ready", share };
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return encodeBase64Url(bytes);
}

function randomPublicHandle(length = 10) {
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let value = "";

  for (const byte of bytes) {
    value += alphabet[byte % alphabet.length];
  }

  return value;
}

function encodeBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
