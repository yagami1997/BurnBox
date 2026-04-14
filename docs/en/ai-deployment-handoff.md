# AI Deployment Handoff

*Last updated: April 13, 2026 at 7:10 PM PDT*

## Purpose

This document is for users who want Claude, GPT, Codex, or a similar coding assistant to carry a fresh BurnBox fork from local checkout to a working Cloudflare deployment.

Use this file as the handoff prompt instead of asking the model to "figure out the repo". The goal is to reduce ambiguity around Cloudflare resource names, required secrets, schema migration order, private-entry configuration, and post-deploy verification.

## What the AI should do

The AI should help the operator complete these tasks in order:

1. Inspect the repository and confirm the deployment files exist.
2. Prepare `wrangler.toml` from `wrangler.toml.template`.
3. Confirm the intended values for:
   - Worker name
   - D1 database name and id
   - R2 bucket name
   - workspace hostname
   - public share hostname
   - `APP_ENTRY_PATH` — decide whether the private workspace will be served at `/` or behind a prefix such as `/ops`
4. Apply D1 migrations in order through all five files.
5. Configure required Worker secrets:
   - `SESSION_SECRET`
   - `SHARE_LINK_SECRET`
   - `CLAIM_KEY` if the deployment is using a manual setup key instead of a log-generated claim code
6. Deploy the Worker.
7. Complete owner claim or upgrade flow:
   - **Alert the operator to save backup codes before closing the workspace.** Backup codes are shown once and cannot be retrieved from the system afterward.
8. Validate private-entry behavior if `APP_ENTRY_PATH` is configured:
   - confirm the workspace loads from the prefixed route
   - confirm `/` does not expose the private workspace
9. Validate workspace account controls: password change, backup-code regeneration, logout, and `Sign Out Other Devices`. Treat recovery email as an optional operator-managed setting.
10. Validate upload, share creation, and direct share download.
11. If public links fail, check `SHARE_LINK_SECRET`, `SHARE_BASE_URL`, `ALLOWED_SHARE_HOSTS`, and route coverage first.

## Important constraints

- Do not invent Cloudflare resource names.
- Do not assume the D1 database name is `burnbox`; read the actual configured value.
- Do not skip `SHARE_LINK_SECRET`. Public share downloads will fail with `503` if it is missing.
- Do not enable hostname-style share links unless wildcard DNS, Worker routes, and certificate coverage are intentionally configured.
- Prefer the path-based stable public link: `/h/{publicHandle}`.
- Do not skip the backup-code save warning. The operator must be told to save codes before closing the browser.

## Recommended operator workflow

Before handing this repo to an AI, have these values ready:

- Cloudflare account access
- one Worker name
- one D1 database name
- one D1 database id
- one R2 bucket name
- one workspace hostname
- one public share hostname
- one owner email
- one strong session secret
- one strong share-link secret
- one manual claim key only if you do not want to rely on a log-generated claim code
- `APP_ENTRY_PATH` value — the prefix for the private workspace (e.g. `/ops`), or omit to serve from `/`
- whether this deployment is fresh or upgrading from a legacy `ADMIN_PASSWORD` instance

## Copy-paste handoff prompt

Use the following prompt with Claude, GPT, Codex, or a similar coding model:

```text
You are helping me deploy a fresh BurnBox fork.

Read these files first and follow them strictly:
- README.md
- docs/README.md
- docs/en/quickstart.md
- docs/en/deployment.md
- docs/en/troubleshooting.md
- docs/en/ai-deployment-handoff.md

Your job is to guide and execute the deployment step by step without guessing configuration.

Rules:
- Inspect the repository before acting.
- Use the actual values I provide for Worker name, D1 database name/id, R2 bucket, workspace host, share host, and APP_ENTRY_PATH.
- Do not assume the D1 database name is "burnbox" unless the config actually uses that name.
- Do not skip SHARE_LINK_SECRET.
- Warn me before any force push, destructive action, or secret overwrite.
- After owner claim or upgrade completes, explicitly tell me to save the backup codes before proceeding. They are shown once.

After deployment, verify in this order:
  1. Owner claim or upgrade works and backup codes are saved.
  2. If APP_ENTRY_PATH is set, the workspace is reachable from the prefixed route and not from /.
  3. Password change works. Recovery email is either intentionally left disabled or verified as enabled.
  4. File upload works and reaches finalization.
  5. Share creation works and the stable link uses the public share host.
  6. The share link downloads directly.
  7. Revoking the share makes the link stop working.

If anything fails, debug in this order:
- wrangler.toml values
- D1 migration state
- Worker secrets
- Cloudflare routes
- share-domain configuration

Keep a short running checklist of what is done and what is still blocked.
```

## Minimal success checklist

A deployment should not be considered complete until all of these are true:

- `wrangler.toml` matches the intended Cloudflare resources
- all five D1 migrations have been applied in order
- `SESSION_SECRET` and `SHARE_LINK_SECRET` exist on the Worker
- `CLAIM_KEY` exists if you are not using log-generated claim codes
- the Worker is deployed to both the workspace host and the public share host
- owner claim or upgrade succeeds
- **backup codes have been saved by the operator**
- if `APP_ENTRY_PATH` is set, the workspace is only reachable from the prefixed route
- workspace account controls succeed after sign-in
- at least one upload completes
- at least one share link downloads successfully

## Related docs

- [Quickstart](quickstart.md)
- [Deployment](deployment.md)
- [Troubleshooting](troubleshooting.md)
- [Architecture](architecture.md)
