# Quickstart

*Last updated: April 12, 2026 at 6:31 PM PDT*

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

Recommended placeholder model:

- workspace: `console.example.com`
- share: `relay.example.net`

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
`CLAIM_KEY` is only for the initial owner-claim path. It should not be treated as the long-lived workspace password.
If `CLAIM_KEY` is omitted, a one-time claim token will be generated and written to the Worker log on first workspace visit.

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

- open the workspace
- if this is a new deployment, complete `Claim your BurnBox`
- if this is an upgraded deployment, complete `Upgrade your BurnBox security`
- confirm owner sign-in works
- decide whether this deployment will use `Recovery email` or keep backup codes as the only recovery path
- confirm `Change password`, `Generate Backup Codes`, and `Sign Out Other Devices` work
- if email recovery is part of this deployment policy, confirm the workspace account card can add a recovery email
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
