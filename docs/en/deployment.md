# Deployment

*Last updated: April 14, 2026 at 6:29 PM PDT*

## Overview

BurnBox 2.3.1 is designed around a split-domain deployment model plus an owner-account auth flow:

- a private workspace domain for authenticated administration, such as `https://console.example.com`
- a public share domain for external file delivery, such as `https://relay.example.net`

This split exists for privacy and operational clarity:

- the public link should not have to expose the workspace hostname
- the public surface should not expose admin routes
- share routing and workspace routing can evolve independently

The current ownership model:

- new deployments are claimed inside the product through a one-time owner-claim flow
- legacy deployments can upgrade from `ADMIN_PASSWORD` to an owner account without data loss
- password rotation, backup codes, optional recovery-email support, and session reset all live inside the workspace
- deployments may optionally move the private workspace behind a deployment-managed entry prefix such as `/ops`

## Key decisions before you start

Make these decisions before touching any configuration:

**1. Private workspace entry prefix (`APP_ENTRY_PATH`)**

Decide whether you want the private workspace reachable at `/` or behind a custom path prefix such as `/ops`. This controls both the HTML workspace route and all authenticated `/api/*` routes. Setting this after initial deployment requires no migration but does change the URL operators use to access the workspace.

If this is a security-sensitive deployment, setting a non-obvious prefix reduces the chance that automated scanners locate the admin surface.

**2. Recovery path strategy**

BurnBox ships with backup codes as the default recovery path. Recovery email is optional and requires intentional operator configuration. Decide upfront:

- backup codes only: simpler, no mail infrastructure needed, codes must be saved securely at claim time
- backup codes + recovery email: adds a second recovery path, requires a working email address reachable by the operator

Either choice is valid. The important point is that backup codes are shown once at claim time. **Save them before closing the workspace.**

## Required Cloudflare resources

BurnBox requires:

- one Worker
- one R2 bucket
- one D1 database
- one private workspace hostname
- one public share hostname

Optional:

- one wildcard share-host route if you want hostname-style sharing

## Recommended domain model

Recommended baseline:

- workspace: `console.example.com`
- share domain: `relay.example.net`
- default stable link: `https://relay.example.net/h/{publicHandle}`

Optional extension:

- hostname-style share link: `https://{publicHandle}.relay.example.net`

Do not make hostname-style sharing your default unless you are also prepared to manage wildcard certificate coverage.

## Why the default stable link uses `/h/{publicHandle}`

BurnBox used to issue token-path links such as `/s/{token}`. That remains valid for compatibility, but it is not the preferred long-term stable form.

The reason is technical:

- only the token hash is stored in D1
- the plaintext token is never stored
- that means the server cannot reconstruct old token links later
- cross-device operator workflows need a reconstructable public URL

`public_handle` fixes that. It is a stable public identifier stored in the `shares` table and can be used to rebuild an active share URL from database state.

## DNS and route setup

### Baseline public share domain

For a path-based public share domain, configure:

- one proxied DNS record for `relay.example.net`
- one Worker route for `relay.example.net/*`
- one Worker route for `console.example.com/*`

### Optional hostname-style sharing

If you want hostnames such as `https://abc123.relay.example.net`, also configure:

- one proxied wildcard DNS record for `*.relay.example.net`
- one Worker route for `*.relay.example.net/*`
- `SHARE_SUBDOMAIN_BASE_DOMAIN=relay.example.net`

### Important certificate note

Wildcard DNS alone is not enough for hostname-style sharing. Certificate coverage matters.

Typical issue:

- `https://relay.example.net` works
- `https://abc123.relay.example.net` fails with an SSL handshake or cipher error

Why:

- Cloudflare Universal SSL does not automatically make every deeper wildcard share-host pattern a safe default for this setup
- operators may need Advanced Certificate Manager, Total TLS, or another explicit certificate strategy

Because of that, BurnBox defaults to the path-based stable link and treats hostname-style sharing as opt-in.

## `wrangler.toml` configuration

Fill in your own values:

```toml
name = "burnbox"
main = "src/worker.js"
compatibility_date = "2026-04-09"

routes = [
  { pattern = "console.example.com/*", zone_name = "example.com" },
  { pattern = "relay.example.net/*", zone_name = "example.net" },
  { pattern = "*.relay.example.net/*", zone_name = "example.net" }
]

d1_databases = [
  { binding = "DB", database_name = "burnbox", database_id = "YOUR_DATABASE_ID" }
]

[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "YOUR_BUCKET_NAME"

[vars]
APP_BASE_URL = "https://console.example.com"
SHARE_BASE_URL = "https://relay.example.net"
SHARE_SUBDOMAIN_BASE_DOMAIN = "relay.example.net"
ALLOWED_APP_HOSTS = "console.example.com"
ALLOWED_SHARE_HOSTS = "relay.example.net"
APP_ENTRY_PATH = "/ops"
```

If you are not enabling hostname-style sharing yet, omit `SHARE_SUBDOMAIN_BASE_DOMAIN`.
If you do not want a prefixed private workspace entry, omit `APP_ENTRY_PATH` and BurnBox will continue to serve the private workspace from `/`.

## Secrets

Set the following production secrets:

- `SESSION_SECRET` — owner session signing
- `SHARE_LINK_SECRET` — public download-signature logic
- `CLAIM_KEY` — one-time setup key for first owner claim, only if you are not using a log-generated claim code

Keep `SESSION_SECRET` and `SHARE_LINK_SECRET` separate. Using the same value for both means admin auth and public delivery share the same secret material, which reduces the isolation between the two surfaces.

`SHARE_LINK_SECRET` is not optional. If it is missing, public share downloads will fail with `503` even though admin login may still appear healthy.

`CLAIM_KEY` is a one-time setup key, not a long-lived workspace password. After the owner claim succeeds and the workspace is operational, the claim token cannot be reused. If `CLAIM_KEY` is omitted, a one-time claim token is generated and written to the Worker log on first workspace visit.

Legacy-upgrade note:

- keep `ADMIN_PASSWORD` in place until the existing workspace completes `Upgrade your BurnBox security`
- after the upgrade succeeds and owner login has been verified, the deployment can remove the legacy password secret

## Database migrations

Apply the schema before the first production deployment:

Replace `burnbox` below with your actual D1 database name if you changed it in `wrangler.toml`.

```bash
npx wrangler d1 execute burnbox --remote --file=./migrations/0001_initial.sql
npx wrangler d1 execute burnbox --remote --file=./migrations/0002_upload_plans.sql
npx wrangler d1 execute burnbox --remote --file=./migrations/0003_multipart_uploads.sql
npx wrangler d1 execute burnbox --remote --file=./migrations/0004_share_public_handle.sql
npx wrangler d1 execute burnbox --remote --file=./migrations/0005_owner_auth.sql
```

Migration notes:

- `0004_share_public_handle.sql` is additive and should be applied as a new migration
- do not rewrite older migrations to pretend the field always existed
- if D1 reports duplicate-column or duplicate-index errors, inspect the live schema before retrying

## Deploy

```bash
npm run deploy
```

## Post-deploy validation

Validate in this order:

1. Open the workspace domain (or the prefixed path if `APP_ENTRY_PATH` is configured).
2. If the deployment is new, complete `Claim your BurnBox`.
   - **Save the backup codes before closing.** They are shown once and cannot be recovered from the system after this point.
3. If the deployment is an upgrade from the legacy password model, complete `Upgrade your BurnBox security`.
   - Same backup-code warning applies at upgrade time.
4. Confirm owner login works with the claimed email and password.
5. Confirm `Change password`, `Regenerate Recovery Codes`, and `Sign Out Other Devices` work from the workspace account controls.
6. If this deployment intends to use email recovery, confirm `Recovery email` can be added and edited from the workspace account card.
7. If `APP_ENTRY_PATH` is configured:
   - confirm the private workspace opens only from that prefixed route
   - confirm `/` does not expose the private workspace
   - run `npm run smoke:private-entry` locally to verify path isolation if modifying the prefix
9. Upload one or more files.
10. Confirm chunked upload reaches finalization and the files appear in the registry.
11. Create a share.
12. Confirm the returned stable URL uses the public share domain.
13. Confirm the stable URL defaults to `/h/{publicHandle}`.
14. Open the link and verify it downloads directly.
15. If the link returns `503`, check that `SHARE_LINK_SECRET` is configured on the deployed Worker.
16. Revoke the share and verify the link fails.
17. Refresh the workspace from a different machine and confirm `Copy link` still appears for the active share.
18. Confirm the public share domain does not expose `/api/*` or the workspace root.

## Randomized privacy-oriented DNS naming

If your goal is to reduce semantic leakage in public links, use a dedicated low-meaning share domain. The public documentation deliberately avoids showing production-like naming patterns, but the deployment principle is:

- keep the workspace hostname recognizable to operators
- keep the share hostname separate from the workspace hostname
- avoid business-meaning words on the public share hostname if link discretion matters
- use one fixed public share hostname, not one DNS record per share
- let `public_handle` vary per share instead of mutating DNS for every issued link

That gives you privacy separation without introducing per-link DNS management.

## Related docs

- [Quickstart](quickstart.md)
- [Architecture](architecture.md)
- [Share Link Delivery Architecture](share-link-delivery.md)
- [Troubleshooting](troubleshooting.md)
- [Maintenance and Data Retention](maintenance.md)
- [Privacy Policy Template](privacy-policy-template.md)
- [Legal Risk Statement](legal-risk-statement.md)
