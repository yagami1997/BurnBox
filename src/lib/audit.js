export async function recordAuditLog(env, entry) {
  if (!env.DB) {
    return;
  }

  try {
    await env.DB.prepare(
      `insert into audit_logs (id, actor, action, target_type, target_id, meta_json, created_at)
       values (?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        crypto.randomUUID(),
        entry.actor,
        entry.action,
        entry.targetType,
        entry.targetId,
        entry.meta ? JSON.stringify(entry.meta) : null,
        new Date().toISOString(),
      )
      .run();
  } catch (error) {
    console.error("audit_log_write_failed", error);
  }
}
