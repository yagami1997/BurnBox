# AI Deployment Handoff

*Last updated: April 12, 2026 at 4:15 AM PDT*

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
   - `ADMIN_PASSWORD`
   - `SESSION_SECRET`
   - `SHARE_LINK_SECRET`
6. Deploy the Worker.
7. Validate workspace login, upload, share creation, and direct share download.
8. If public links fail, check `SHARE_LINK_SECRET`, `SHARE_BASE_URL`, `ALLOWED_SHARE_HOSTS`, and route coverage first.

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
- one admin password
- one strong session secret
- one strong share-link secret

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
  1. workspace login works
  2. file upload works
  3. share creation works
  4. the stable link uses the public share host
  5. the share link downloads directly

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
- all four D1 migrations have been applied in order
- `ADMIN_PASSWORD`, `SESSION_SECRET`, and `SHARE_LINK_SECRET` exist on the Worker
- the Worker is deployed to both the workspace host and the public share host
- workspace login succeeds
- at least one upload completes
- at least one share link downloads successfully

## Related docs

- [Quickstart](quickstart.md)
- [Deployment](deployment.md)
- [Troubleshooting](troubleshooting.md)
