# Quickstart

*Last updated: April 13, 2026 at 7:10 PM PDT*

## Requirements

- Node.js 18+
- a Cloudflare account
- one R2 bucket
- one D1 database
- one workspace hostname
- one public share hostname

## 1. Install dependencies

```bash
npm install
```

## 2. Prepare configuration

Copy `wrangler.toml.template` to `wrangler.toml`.

Replace the placeholders with your own values:

- Worker name
- D1 database id
- R2 bucket name
- account variables
- workspace hostname
- share hostname
- optional `APP_ENTRY_PATH`

Recommended placeholder model:

- workspace: `console.example.com`
- share: `relay.example.net`
- optional private entry prefix: `/ops`

## 3. Apply the database schema

Replace `burnbox` below with your actual D1 database name if you did not keep the default.

```bash
npx wrangler d1 execute burnbox --remote --file=./migrations/0001_initial.sql
npx wrangler d1 execute burnbox --remote --file=./migrations/0002_upload_plans.sql
npx wrangler d1 execute burnbox --remote --file=./migrations/0003_multipart_uploads.sql
npx wrangler d1 execute burnbox --remote --file=./migrations/0004_share_public_handle.sql
npx wrangler d1 execute burnbox --remote --file=./migrations/0005_owner_auth.sql
```

For local D1 emulation you may also want:

```bash
npx wrangler d1 execute burnbox --local --file=./migrations/0001_initial.sql
npx wrangler d1 execute burnbox --local --file=./migrations/0002_upload_plans.sql
npx wrangler d1 execute burnbox --local --file=./migrations/0003_multipart_uploads.sql
npx wrangler d1 execute burnbox --local --file=./migrations/0004_share_public_handle.sql
npx wrangler d1 execute burnbox --local --file=./migrations/0005_owner_auth.sql
```

## 4. Configure production secrets

```bash
npx wrangler secret put SESSION_SECRET
npx wrangler secret put SHARE_LINK_SECRET
npx wrangler secret put CLAIM_KEY
```

`SHARE_LINK_SECRET` is mandatory for public downloads. If it is missing, share links will return `503` even if the workspace login still works.

`CLAIM_KEY` is a one-time setup key for the initial owner-claim flow. It is not a long-lived workspace password and cannot be reused after claim succeeds. If `CLAIM_KEY` is omitted, a one-time claim token is generated and written to the Worker log on first workspace visit.

Keep `SESSION_SECRET` and `SHARE_LINK_SECRET` as separate values to isolate admin session signing from public download-signature logic.

## 5. Configure local development secrets

Create `.dev.vars` in the project root:

```env
SESSION_SECRET=your-long-random-session-secret
SHARE_LINK_SECRET=your-long-random-share-link-secret
CLAIM_KEY=your-one-time-local-claim-key
```

This is required for `wrangler dev --remote`, because local development still needs Worker secrets.

## 6. Start development

```bash
npm run dev
```

## 7. Verify the system

Check the main flow:

- open the workspace (use the prefixed route if `APP_ENTRY_PATH` is configured)
- if this is a new deployment, complete `Claim your BurnBox`
  - **save the backup codes before closing the browser** — they are shown once and cannot be retrieved afterward
- if this is an upgraded deployment, complete `Upgrade your BurnBox security`
  - the same backup-code warning applies at upgrade time
- confirm owner sign-in works with the claimed email and password
- decide whether this deployment will use `Recovery email` or rely on backup codes only
- confirm `Change password`, `Regenerate Recovery Codes`, and `Sign Out Other Devices` work
- if email recovery is part of this deployment policy, confirm the workspace account card can add and edit a recovery email
- if `APP_ENTRY_PATH` is configured:
  - confirm the workspace loads only from the prefixed route
  - confirm `/` does not expose the private workspace
- upload a test file
- confirm multipart upload reaches finalization
- confirm the current baseline can handle large transfers without visible oscillation
- confirm the file appears in the list
- create a share
- confirm the stable link uses the public share domain
- confirm the stable link defaults to `/h/{publicHandle}`
- open the link and verify direct download
- if the link returns `503`, confirm `SHARE_LINK_SECRET` is configured on the deployed Worker
- refresh the workspace from another machine or browser profile
- confirm `Copy link` still appears for the active share
- revoke the link and verify it stops working

## 8. Understand the link model

BurnBox currently uses three public-share concepts:

- `/h/{publicHandle}`: the default stable link
- `/s/{token}`: legacy compatibility link
- `{publicHandle}.relay.example.net`: optional hostname-style link when explicitly enabled

For the design rationale, read:

- [Share Link Delivery Architecture](share-link-delivery.md)
- [Architecture](architecture.md)
- [Concurrent Chunked Upload Design](concurrent-chunked-upload.md)
- [Development Plan](development-plan.md)
