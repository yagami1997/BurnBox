# Deployment

*Last updated: April 9, 2026 at 12:49 AM PDT*

## Cloudflare resources

BurnBox requires:

- one Worker
- one R2 bucket
- one D1 database

## Configuration

Fill in your own values in `wrangler.toml`:

- Worker name
- route pattern
- zone name or zone id
- D1 binding
- R2 bucket binding
- account-level variables

Do not commit personal production values.

## Secrets

Set the following secrets for production:

- `ADMIN_PASSWORD`
- `SESSION_SECRET`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

## Login protection

Protect `POST /api/auth/login` with a Cloudflare WAF or rate-limit rule in production. BurnBox does not keep lockout state in application storage.

## Database migration

Apply the schema before the first deployment:

```bash
npx wrangler d1 execute burnbox --remote --file=./migrations/0001_initial.sql
npx wrangler d1 execute burnbox --remote --file=./migrations/0002_upload_plans.sql
```

## Deploy

```bash
npm run deploy
```

## Post-deploy checks

- log in successfully
- upload a file successfully
- verify file list rendering
- create a temporary share
- copy and open the share link
- revoke the share and verify it fails

## R2 CORS

Because uploads are sent from the browser directly to R2, your bucket CORS policy must allow:

- method: `PUT`
- your admin origin
- header: `Content-Type`
