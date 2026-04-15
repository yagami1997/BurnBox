# BurnBox Release Checklist

*Last updated: April 14, 2026 at 6:29 PM PDT*

## 2.3.1 Upgrade Notes

BurnBox 2.3.1 is a documentation and metadata patch. There are no new D1 migrations, no new environment variables, no API changes, and no changes to the deployment model.

To upgrade from 2.3.0:

- deploy the new Worker build (`wrangler deploy`)
- no database changes required
- no secrets changes required
- review `docs/en/maintenance.md` and schedule periodic D1 cleanup appropriate for your deployment's compliance obligations

---

## 2.3.0 Upgrade Notes

BurnBox 2.3.0 adds resumable upload, a deployment status card, Claim-page UX hardening, and a first-deploy guidance banner. There are no new D1 migrations, no new environment variables, and no changes to the deployment model.

To upgrade from 2.2.2:

- deploy the new Worker build (`wrangler deploy`)
- confirm upload, resume banner, Deployment card, and Logout still work as expected
- no database changes required
- no secrets changes required

---

## 2.2.2 Upgrade Notes

BurnBox 2.2.2 is a frontend-JS maintainability release. There are no new D1 migrations, no new environment variables, and no changes to the deployment model.

To upgrade from 2.2.1:

- deploy the new Worker build (`wrangler deploy`)
- confirm all existing workspace actions still work: Logout, Refresh, upload, share create/revoke, account security panels
- no database changes required
- no secrets changes required

---

## 2.2.1 Full Checklist

Use this checklist before promoting BurnBox 2.2.1 (or later) to a shared environment for the first time.

## Environment

- Confirm `SESSION_SECRET` is set.
- Confirm `SHARE_LINK_SECRET` is set.
- Confirm `APP_BASE_URL`, `SHARE_BASE_URL`, `ALLOWED_APP_HOSTS`, and `ALLOWED_SHARE_HOSTS` match the intended deployment.
- If you are using a private workspace entry prefix, confirm `APP_ENTRY_PATH` is set to the intended exact route prefix.
- If you are not using a log-generated claim code, confirm `CLAIM_KEY` is set as a one-time setup secret.

## Database

- Apply migrations in order, including `migrations/0005_owner_auth.sql`.
- Confirm the D1 database contains the owner-auth tables: `owner_account`, `claim_tokens`, `recovery_codes`, and `auth_events`.
- Confirm legacy deployments still retain the existing file and share tables.

## New Deployment Flow

- Open the workspace before any account exists.
- Confirm the app shows `Claim your BurnBox`.
- Complete claim with owner email, password, confirmation, and claim code.
- Confirm the response returns recovery codes once and the claim token cannot be reused.
- Confirm reloading the workspace shows the authenticated owner workspace instead of the claim form.

## Upgrade Flow

- Start from a deployment that still uses the legacy `ADMIN_PASSWORD` path.
- Confirm the app shows the upgrade login entry rather than the owner login form.
- Sign in with the legacy password and confirm the app advances to `Upgrade your BurnBox security`.
- Complete upgrade with owner email, password, confirmation, and recovery-code generation.
- Confirm subsequent logins use owner email plus password, not the legacy password.

## Recovery and Session Controls

- Confirm `Reset with recovery code` accepts a valid owner email and unused recovery code.
- Confirm a used recovery code cannot be reused.
- Confirm five invalid recovery attempts trigger a temporary lock.
- Decide whether `Recovery email` is enabled for this deployment. If not, confirm the deployment intentionally relies on backup codes only. If yes, confirm it can be added or removed from the workspace account card.
- Confirm `Change password` rotates the session version and invalidates older sessions.
- Confirm `Sign Out Other Devices` invalidates other active sessions while preserving the current session.
- Confirm `Regenerate recovery codes` replaces the current set and returns a fresh list once.

## Share and Workspace Regression

- Upload a file and confirm multipart upload still completes.
- If `APP_ENTRY_PATH` is enabled, confirm the workspace loads from that prefixed route and `/` does not expose the private workspace.
- Confirm `Logout`, `Refresh`, and upload still work from the prefixed workspace route.
- Intentionally interrupt one upload and confirm the failed multipart session is aborted instead of accumulating silently.
- Create a share link and confirm the public URL resolves from the share domain.
- Confirm download limits and expiration still work.
- Delete a file and confirm its share links are revoked.

## Security Regression

- Confirm failed owner logins log a generic `invalid_credentials` reason.
- Confirm legacy upgrade logins return `429` after repeated failures.
- Confirm recovery reset returns a generic invalid-details error for bad email or bad code.
- Confirm auth/session responses never include `passwordHash` or `passwordAlgo`.
- Confirm no public route renders the private workspace without a valid owner session.
