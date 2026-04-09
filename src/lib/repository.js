export async function listFiles(env) {
  if (!env.DB) {
    return [];
  }

  try {
    const result = await env.DB.prepare(
      `select
        f.id,
        f.filename,
        f.size,
        f.storage_key,
        f.content_type,
        f.tags_json,
        f.note,
        f.created_at,
        (
          select s.id
          from shares s
          where s.file_id = f.id
            and s.revoked_at is null
            and s.expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
            and (s.max_downloads is null or s.download_count < s.max_downloads)
          order by s.created_at desc
          limit 1
        ) as active_share_id,
        (
          select s.expires_at
          from shares s
          where s.file_id = f.id
            and s.revoked_at is null
            and s.expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
            and (s.max_downloads is null or s.download_count < s.max_downloads)
          order by s.created_at desc
          limit 1
        ) as active_share_expires_at,
        (
          select s.max_downloads
          from shares s
          where s.file_id = f.id
            and s.revoked_at is null
            and s.expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
            and (s.max_downloads is null or s.download_count < s.max_downloads)
          order by s.created_at desc
          limit 1
        ) as active_share_max_downloads,
        (
          select s.download_count
          from shares s
          where s.file_id = f.id
            and s.revoked_at is null
            and s.expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
            and (s.max_downloads is null or s.download_count < s.max_downloads)
          order by s.created_at desc
          limit 1
        ) as active_share_download_count
       from files
       f
       where f.deleted_at is null
       order by f.created_at desc
       limit 100`,
    ).all();

    return (result.results || []).map((row) => ({
      id: row.id,
      filename: row.filename,
      size: row.size,
      contentType: row.content_type,
      storageKey: row.storage_key,
      tags: safeParseJson(row.tags_json, []),
      note: row.note || "",
      createdAt: row.created_at,
      activeShare: row.active_share_id
        ? {
            id: row.active_share_id,
            expiresAt: row.active_share_expires_at,
            maxDownloads: row.active_share_max_downloads,
            downloadCount: row.active_share_download_count,
          }
        : null,
    }));
  } catch (error) {
    // Phase 1 should still boot before D1 is initialized.
    if (String(error?.message || "").toLowerCase().includes("no such table")) {
      return [];
    }
    throw error;
  }
}

function safeParseJson(value, fallback) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
