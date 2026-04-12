# Quickstart

*Last updated: April 11, 2026 at 4:21 AM PDT*

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
```

For local D1 emulation you may also want:

```bash
npx wrangler d1 execute burnbox --local --file=./migrations/0001_initial.sql
npx wrangler d1 execute burnbox --local --file=./migrations/0002_upload_plans.sql
npx wrangler d1 execute burnbox --local --file=./migrations/0003_multipart_uploads.sql
npx wrangler d1 execute burnbox --local --file=./migrations/0004_share_public_handle.sql
```

## 4. Configure production secrets

```bash
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put SESSION_SECRET
npx wrangler secret put SHARE_LINK_SECRET
```

`SHARE_LINK_SECRET` is mandatory for public downloads. If it is missing, share links will return `503` even if the workspace login still works.

## 5. Configure local development secrets

Create `.dev.vars` in the project root:

```env
ADMIN_PASSWORD=your-local-admin-password
SESSION_SECRET=your-long-random-session-secret
SHARE_LINK_SECRET=your-long-random-share-link-secret
```

This is required for `wrangler dev --remote`, because local development still needs Worker secrets.

## 6. Start development

```bash
npm run dev
```

## 7. Verify the system

Check the main 2.1.1 flow:

- log in to the workspace
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
- [Concurrent Chunked Upload Design](concurrent-chunked-upload.md)
- [Development Plan](development-plan.md)
