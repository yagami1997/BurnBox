# Troubleshooting

*Last updated: April 9, 2026 at 12:49 AM PDT*

## Upload succeeds but the file does not appear

Check:

- D1 migration has been applied
- `complete-upload` succeeds
- the Worker is running against the expected environment

## Direct upload fails

Check:

- R2 CORS configuration
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- account id and bucket name

## Share creation returns an error

Check:

- the file still exists
- D1 schema is up to date
- the `upload_plans` migration has been applied
- the share payload is valid

## Route deployment fails

Check:

- the route is not already assigned to another Worker
- `zone_name` or `zone_id` is set correctly in `wrangler.toml`

## Local development behaves differently from production

Prefer remote development mode:

```bash
npm run dev
```

This repository uses `wrangler dev --remote` by default to reduce local/remote binding mismatches.

## Older files do not appear in the registry

The current registry view returns the latest 100 non-deleted files. If you operate larger archives, add pagination before relying on the UI for full-history management.
