# Troubleshooting

*Last updated: April 11, 2026 at 4:27 AM PDT*

## Upload succeeds but the file does not appear

Check:

- all D1 migrations have been applied, including `0003_multipart_uploads.sql`
- `complete-upload` succeeds
- the Worker is running against the expected environment
- the upload is not still in finalization

## Upload reaches a high percentage and appears to stop

BurnBox separates chunk transfer from final object finalization. If the upload reaches the high nineties and switches to a finalizing state, the transfer body is already done and the Worker is completing multipart assembly plus D1 writeback.

## Chunked upload fails

Check:

- production secrets are correct
- local `.dev.vars` exists when using `wrangler dev --remote`
- the Worker route is current
- the file is not being tested against an outdated cached frontend bundle
- the upload plan and upload parts schema are present in D1

Current baseline note:

- BurnBox 2.1.1 has already been validated through large multipart transfers up to `4.3 GB / 870 parts` and `11 GB / 2200 parts`
- if a new failure appears, treat it as a recoverability or environment-specific problem first, not as proof that large uploads are inherently unsupported

The next planned mitigation is resumable upload. See the [Development Plan](development-plan.md).

## Migration reports duplicate column errors

If `0003_multipart_uploads.sql` or `0004_share_public_handle.sql` fails with a duplicate-column or duplicate-index error, your D1 database may already contain the expected schema. Inspect the live table structure first instead of rerunning the same migration blindly.

## Share creation returns an error

Check:

- the file still exists
- D1 schema is up to date
- `0004_share_public_handle.sql` has been applied
- the share payload is valid
- `SHARE_BASE_URL` is configured

## Share link returns `503`

This usually means the public download path is not fully configured, even if workspace login still works.

Check:

- `SHARE_LINK_SECRET` exists on the deployed Worker
- the public share host is routed to the current Worker version
- `ALLOWED_SHARE_HOSTS` includes the exact public share host
- `SHARE_BASE_URL` points to that same public share host

If you recently hardened a deployment that used to fall back to `SESSION_SECRET`, missing `SHARE_LINK_SECRET` is the first thing to verify.

## An active share exists but `Copy link` does not appear

Check:

- the active share was created after `public_handle` support was deployed
- `0004_share_public_handle.sql` has been applied
- the workspace file list is being loaded from the current deployment
- the active share has not expired or been exhausted

BurnBox 2.1.1 reconstructs active links from `public_handle`. It should not depend on browser-local cache anymore.

## Public share link opens the wrong host

Check:

- `SHARE_BASE_URL` points to the public share hostname
- the workspace hostname is configured in `APP_BASE_URL`
- `ALLOWED_APP_HOSTS` and `ALLOWED_SHARE_HOSTS` match the intended split

## Hostname-style share links fail with SSL errors

Typical symptoms:

- `ERR_SSL_VERSION_OR_CIPHER_MISMATCH`
- TLS handshake failure on `https://abc123.relay.example.net`

Check:

- wildcard DNS is proxied
- wildcard Worker route exists
- wildcard certificate coverage actually exists

If the wildcard certificate layer is not intentionally provisioned, fall back to the stable path-based share link:

- `https://relay.example.net/h/{publicHandle}`

## Share domain exposes admin routes

Check:

- the Worker deployment is current
- `ALLOWED_SHARE_HOSTS` includes only the exact public share host
- your public share host is routed to the same Worker version as the workspace host

The public share host should not expose `/api/*` or the workspace root.

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
