# Troubleshooting

*Last updated: April 9, 2026 at 5:42 AM PDT*

## Upload succeeds but the file does not appear

Check:

- all D1 migrations have been applied, including `0003_multipart_uploads.sql`
- `complete-upload` succeeds
- the Worker is running against the expected environment
- the upload is not still in finalization

## Upload reaches a high percentage and appears to stop

BurnBox now separates chunk transfer from final object finalization. If the upload reaches the high-nineties and switches to a finalizing state, the transfer body is already done and the Worker is completing multipart assembly plus D1 writeback.

## Chunked upload fails

Check:

- production secrets are correct
- local `.dev.vars` exists when using `wrangler dev --remote`
- the Worker route is current
- the file is not being tested against an outdated cached frontend bundle
- the upload plan and upload parts schema are present in D1

## Migration reports duplicate column errors

If `0003_multipart_uploads.sql` fails with a duplicate-column error, your D1 database may already contain the multipart fields. Inspect the table schema first instead of rerunning the same migration blindly.

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
