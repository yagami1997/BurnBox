# Quickstart

*Last updated: April 9, 2026 at 12:49 AM PDT*

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
```

For local development with D1 emulation, you may also want to run:

```bash
npx wrangler d1 execute burnbox --local --file=./migrations/0001_initial.sql
```

## 4. Configure secrets

```bash
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put SESSION_SECRET
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
```

## 5. Start development

```bash
npm run dev
```

## 6. Verify the workspace

- log in to the admin workspace
- upload a test file
- confirm it appears in the file list
- create a share link
- download from that link
- revoke the link and verify it stops working
