# BurnBox Maintenance and Data Retention

This document provides SQL scripts for periodic maintenance of the D1 database used by a BurnBox deployment. Running these scripts on a schedule limits unbounded data growth and helps deployers satisfy data-minimization obligations where applicable.

BurnBox does not ship automatic cleanup because Workers do not provide a native background scheduler by default. If you want automated cleanup, attach a [Cloudflare Cron Trigger](https://developers.cloudflare.com/workers/configuration/cron-triggers/) to a maintenance Worker that runs the statements below.

---

## Why retention limits matter

BurnBox logs IP addresses, browser user-agent strings, and authentication event details in `auth_events`. It also records file-operation actor and metadata in `audit_logs`. Both tables grow indefinitely without cleanup.

Keeping these records indefinitely:

- increases your exposure if the database is ever compromised
- may conflict with the storage-limitation and data-minimization principles in GDPR (Art. 5), PIPL (Art. 19), and similar frameworks in other jurisdictions
- provides diminishing diagnostic value for events older than a few months

The retention windows below are starting-point recommendations. Adjust them to match your operational and legal requirements.

---

## Cleanup scripts

Run these against your D1 database using `wrangler d1 execute <DATABASE_NAME> --remote`.

### Authentication and security events

Keep 90 days of login attempts, failed claims, recovery attempts, and related events. Older records no longer serve a useful security purpose for a single-operator deployment.

```sql
DELETE FROM auth_events
WHERE created_at < datetime('now', '-90 days');
```

### File operation audit logs

Keep 1 year of upload, delete, share-create, share-revoke, and download records. One year provides a reasonable window for operational review and potential legal hold while limiting long-term accumulation.

```sql
DELETE FROM audit_logs
WHERE created_at < datetime('now', '-1 year');
```

### Expired and used claim tokens

One-time claim tokens that have been used or have expired serve no further purpose.

```sql
DELETE FROM claim_tokens
WHERE used_at IS NOT NULL
   OR expires_at < datetime('now');
```

### Expired and used password reset tokens

Password reset tokens that have been consumed or have passed their expiry window can be removed.

```sql
DELETE FROM password_reset_tokens
WHERE used_at IS NOT NULL
   OR expires_at < datetime('now');
```

---

## Notes

- `upload_parts` rows are removed automatically when an upload completes (`complete-upload`) or is aborted (`abort-upload`). No manual cleanup is needed for that table under normal operation.
- `upload_plans` rows with status `failed` or `aborted` are not automatically removed. They accumulate slowly and are low volume, but you may delete them after a retention window if desired:

```sql
DELETE FROM upload_plans
WHERE status IN ('failed', 'aborted')
  AND updated_at < datetime('now', '-90 days');
```

- Always run cleanup against your live D1 instance with `--remote`. Local development databases are separate and do not need scheduled cleanup.

---

## Running a manual cleanup

```sh
wrangler d1 execute <DATABASE_NAME> --remote --command \
  "DELETE FROM auth_events WHERE created_at < datetime('now', '-90 days')"
```

Replace `<DATABASE_NAME>` with the name configured in your `wrangler.toml`.

---

## Setting up automated cleanup with Cron Triggers

1. Create a separate cleanup Worker or add a scheduled handler to your existing Worker:

```js
export default {
  async scheduled(event, env, ctx) {
    const statements = [
      env.DB.prepare("DELETE FROM auth_events WHERE created_at < datetime('now', '-90 days')"),
      env.DB.prepare("DELETE FROM audit_logs WHERE created_at < datetime('now', '-1 year')"),
      env.DB.prepare("DELETE FROM claim_tokens WHERE used_at IS NOT NULL OR expires_at < datetime('now')"),
      env.DB.prepare("DELETE FROM password_reset_tokens WHERE used_at IS NOT NULL OR expires_at < datetime('now')"),
    ];
    await env.DB.batch(statements);
  },
};
```

2. Add a Cron Trigger to `wrangler.toml`:

```toml
[triggers]
crons = ["0 3 * * 0"]  # Every Sunday at 03:00 UTC
```

3. Deploy the Worker.

The scheduled handler runs independently of incoming HTTP requests and has no impact on upload or share performance.
