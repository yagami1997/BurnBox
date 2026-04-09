# Quickstart

*Last updated: April 9, 2026 at 5:42 AM PDT*

## Requirements

- Node.js 18+
- A Cloudflare account
- One R2 bucket
- One D1 database

## 1. Install dependencies

```bash
npm install
```

## 2. Prepare configuration

Copy `wrangler.toml.template` to `wrangler.toml` and replace the placeholder values with your own account, bucket, and database settings.

## 3. Apply the database schema

```bash
npx wrangler d1 execute burnbox --remote --file=./migrations/0001_initial.sql
npx wrangler d1 execute burnbox --remote --file=./migrations/0002_upload_plans.sql
npx wrangler d1 execute burnbox --remote --file=./migrations/0003_multipart_uploads.sql
```

For local development with D1 emulation, you may also want to run:

```bash
npx wrangler d1 execute burnbox --local --file=./migrations/0001_initial.sql
npx wrangler d1 execute burnbox --local --file=./migrations/0002_upload_plans.sql
npx wrangler d1 execute burnbox --local --file=./migrations/0003_multipart_uploads.sql
```

## 4. Configure production secrets

```bash
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put SESSION_SECRET
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
```

## 5. Configure local development secrets

Create a `.dev.vars` file in the project root:

```env
ADMIN_PASSWORD=your-local-admin-password
SESSION_SECRET=your-long-random-session-secret
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
```

This is required for `wrangler dev --remote`, because local development still needs access to the Worker secrets.

## 6. Start development

```bash
npm run dev
```

## 7. Verify the workspace

- log in to the admin workspace
- upload a test file
- confirm chunked upload reaches finalization
- confirm it appears in the file list
- create a share link
- download from that link
- revoke the link and verify it stops working

For the design rationale behind the upload path, read [Concurrent Chunked Upload Design](concurrent-chunked-upload.md).
