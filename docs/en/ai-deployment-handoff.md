# AI Deployment Handoff

*Last updated: April 12, 2026 at 6:31 PM PDT*

## Purpose

This document is for users who want Claude, GPT, Codex, or a similar coding assistant to carry a fresh BurnBox fork from local checkout to a working Cloudflare deployment.

Use this file as the handoff prompt instead of asking the model to "figure out the repo". The goal is to reduce ambiguity around Cloudflare resource names, required secrets, schema migration order, and share-link verification.

## What the AI should do

The AI should help the operator complete these tasks in order:

1. Inspect the repository and confirm the deployment files exist.
2. Prepare `wrangler.toml` from `wrangler.toml.template`.
3. Confirm the intended Worker name, D1 database name, D1 database id, R2 bucket name, workspace hostname, and public share hostname.
4. Apply D1 migrations in order.
5. Configure required Worker secrets:
   - `SESSION_SECRET`
   - `SHARE_LINK_SECRET`
   - `CLAIM_KEY` if the deployment is using a manual setup key instead of a log-generated claim code
6. Deploy the Worker.
7. Validate owner claim or upgrade flow, upload, share creation, and direct share download.
8. Verify workspace account controls: recovery email, password change, backup-code generation, logout, and `Sign Out Other Devices`.
9. If public links fail, check `SHARE_LINK_SECRET`, `SHARE_BASE_URL`, `ALLOWED_SHARE_HOSTS`, and route coverage first.

## Important constraints

- Do not invent Cloudflare resource names.
- Do not assume the D1 database name is `burnbox`; read the actual configured value.
- Do not skip `SHARE_LINK_SECRET`. Public share downloads will fail with `503` if it is missing.
- Do not enable hostname-style share links unless wildcard DNS, Worker routes, and certificate coverage are intentionally configured.
- Prefer the path-based stable public link: `/h/{publicHandle}`.

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
- Use the actual values I provide for Worker name, D1 database name/id, R2 bucket, workspace host, and share host.
- Do not assume the D1 database name is "burnbox" unless the config actually uses that name.
- Do not skip SHARE_LINK_SECRET.
- Warn me before any force push, destructive action, or secret overwrite.
- After deployment, verify:
  1. owner claim or upgrade works
  2. recovery email and password change work
  3. file upload works
  4. share creation works
  5. the stable link uses the public share host
  6. the share link downloads directly

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
- workspace account controls succeed after sign-in
- at least one upload completes
- at least one share link downloads successfully

## Related docs

- [Quickstart](quickstart.md)
- [Deployment](deployment.md)
- [Troubleshooting](troubleshooting.md)
