<div align="center">

# BurnBox

**Private R2 drop workspace for controlled file release, short-lived capability sharing, and durable operator ownership.**

`Cloudflare Workers` · `R2` · `D1` · `Server-rendered HTML/CSS/JS` · `GPL-3.0`

<p>
  <img src="https://img.shields.io/badge/Runtime-Cloudflare%20Workers-1f6feb?style=flat-square&labelColor=4b4f56" alt="Cloudflare Workers" />
  <img src="https://img.shields.io/badge/Storage-R2-1d436b?style=flat-square&labelColor=4b4f56" alt="R2" />
  <img src="https://img.shields.io/badge/Database-D1-0f766e?style=flat-square&labelColor=4b4f56" alt="D1" />
  <img src="https://img.shields.io/badge/UI-Server--Rendered-5b6470?style=flat-square&labelColor=4b4f56" alt="Server rendered UI" />
  <img src="https://img.shields.io/badge/License-GPL--3.0-e0b422?style=flat-square&labelColor=4b4f56" alt="GPL-3.0" />
</p>

</div>

---

## Contents

- [Why BurnBox Exists](#why-burnbox-exists)
- [Why This Repository Is Public](#why-this-repository-is-public)
- [Stack](#stack)
- [Changelog](#changelog)
- [Workspace Preview](#workspace-preview)
- [Technical Philosophy](#technical-philosophy)
- [Technical Significance](#technical-significance)
- [Core Architecture](#core-architecture)
- [Features](#features)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Documentation](#documentation)
- [Contribution and Security](#contribution-and-security)
- [Security Model](#security-model)
- [Notes](#notes)
- [License](#license)

## Why BurnBox Exists

BurnBox is built for a narrow operational model:

- the file remains in infrastructure you control
- administration happens in a private workspace, not a public upload surface
- external access is treated as a revocable capability
- expiration, download limits, and revocation are first-class controls

This project is intentionally not a generic public file-sharing site. It is a compact control plane for issuing and withdrawing access to files already stored in your own bucket.

## Why This Repository Is Public

BurnBox began as a private operational tool. It is being opened because small, security-conscious systems are worth studying in the open.

Publishing it is useful for three reasons:

- it shows that an internal tool can remain small, auditable, and operationally honest
- it offers a practical edge-native reference for builders who want direct control over storage and capability links
- it documents a concrete pattern where file durability and external reach are intentionally separated

## Stack

- Cloudflare Workers for routing, session enforcement, upload coordination, share validation, and response delivery
- Cloudflare R2 for durable object storage
- Cloudflare D1 for file metadata, upload state, share state, and audit records
- Plain server-rendered HTML, CSS, and JavaScript for a minimal deployment surface
- `aws4fetch` for R2-compatible request signing

## Changelog

### April 10, 2026 · BurnBox 2.1.0 Share-Domain Release · 7:14 PM PDT

- shipped split-domain sharing with a private workspace domain and a public share domain
- introduced `public_handle` as the stable public identifier for share links
- changed the default stable share URL to `https://relay.example.net/h/{publicHandle}`
- kept legacy `/s/{token}` links for compatibility instead of breaking existing shares
- removed the mandatory share landing page from the default flow and restored direct-download behavior
- fixed cross-device `Copy link` behavior by making active share URLs reconstructable on the server
- documented Cloudflare DNS, route, and certificate constraints for hostname-style sharing

<details>
<summary>Older changelog entries</summary>

### April 9, 2026 · Major Refactor and Chunked Upload Rollout · 5:42 AM PDT

- rebuilt BurnBox around a single Cloudflare Worker, R2, and D1 architecture
- replaced the legacy public-upload flow with a private admin workspace
- introduced signed admin sessions and hashed share-token storage
- redesigned the interface, share controls, and documentation structure for public release
- moved the upload path from optimistic single-request transfer to a chunked multipart model
- adopted 5 MiB chunk slicing for stability-first transfer behavior
- added D1-backed upload plans and uploaded-part tracking

</details>

## Workspace Preview

![BurnBox workspace overview](docs/assets/burnbox-workspace-screenshot.png)

## Technical Philosophy

- Keep the architecture thin enough to audit.
- Keep the operator in direct control of storage and access policy.
- Prefer capability invalidation over destructive file lifecycle tricks.
- Use Cloudflare-native primitives instead of layering an unnecessary backend stack.
- Make the whole system understandable to a single maintainer.

## Technical Significance

BurnBox demonstrates a practical pattern for private file operations on the edge:

- browser-driven administration inside a single Worker
- hashed share tokens instead of plaintext capability storage
- revocable, bounded distribution links on top of durable storage
- chunked multipart upload for reliability-sensitive edge ingestion
- split-domain delivery so public links do not have to expose the admin surface

## Core Architecture

The BurnBox 2.0.0 line solved upload reliability with chunked multipart ingest. The BurnBox 2.1.0 line extends that base into a share-delivery redesign.

The current share architecture uses:

- one private workspace domain such as `https://console.example.com`
- one public share domain such as `https://relay.example.net`
- stable public identifiers stored as `public_handle`
- direct-download share links using `/h/{publicHandle}`
- legacy `/s/{token}` compatibility for older issued links
- optional hostname-style sharing for operators who are willing to manage wildcard certificates

That route was chosen for a specific reason: the original token-based path could not be reconstructed across devices because only the token hash is stored in D1. `public_handle` fixes that by giving the system a stable public identifier that can be rebuilt from database state without exposing internal file or share IDs.

Read the technical notes here:

- [Architecture](docs/en/architecture.md)
- [Share Link Delivery Architecture](docs/en/share-link-delivery.md)
- [Concurrent Chunked Upload Design](docs/en/concurrent-chunked-upload.md)

## Features

- signed admin session with `HttpOnly` cookie
- chunked multipart upload with 5 MiB slices
- D1-backed file, upload, and share metadata
- split-domain sharing with share-domain URL generation
- stable share URLs using `public_handle`
- legacy token-link compatibility
- share revocation and download limits
- file deletion with related share invalidation
- minimal single-worker architecture

## Project Structure

- `src/worker.js`: Worker entrypoint and route handling
- `src/lib/http.js`: response helpers, cookie parsing, and timing-safe comparison
- `src/lib/audit.js`: audit log write helper
- `src/lib/session.js`: signed session handling
- `src/lib/files.js`: upload planning, part upload, multipart completion, deletion
- `src/lib/shares.js`: share creation, revoke, view/download resolution, and capability checks
- `src/lib/repository.js`: file list query layer and active share projection
- `src/lib/layout.js`: admin workspace rendering and client-side interaction logic
- `migrations/0001_initial.sql`: initial D1 schema
- `migrations/0002_upload_plans.sql`: upload plan table
- `migrations/0003_multipart_uploads.sql`: multipart upload state extensions
- `migrations/0004_share_public_handle.sql`: stable public share handle support

## Quick Start

1. Install dependencies.

```bash
npm install
```

2. Copy `wrangler.toml.template` to `wrangler.toml` and replace the placeholders.

3. Create one R2 bucket and one D1 database in Cloudflare.

4. Apply the schema.

```bash
npx wrangler d1 execute burnbox --remote --file=./migrations/0001_initial.sql
npx wrangler d1 execute burnbox --remote --file=./migrations/0002_upload_plans.sql
npx wrangler d1 execute burnbox --remote --file=./migrations/0003_multipart_uploads.sql
npx wrangler d1 execute burnbox --remote --file=./migrations/0004_share_public_handle.sql
```

5. Configure production secrets.

```bash
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put SESSION_SECRET
npx wrangler secret put SHARE_LINK_SECRET
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
```

6. Start remote development.

```bash
npm run dev
```

## Documentation

- [Documentation index](docs/README.md)
- English
  - [Quickstart](docs/en/quickstart.md)
  - [Deployment](docs/en/deployment.md)
  - [Architecture](docs/en/architecture.md)
  - [Share Link Delivery Architecture](docs/en/share-link-delivery.md)
  - [Concurrent Chunked Upload Design](docs/en/concurrent-chunked-upload.md)
  - [Troubleshooting](docs/en/troubleshooting.md)
  - [Repository Boundaries](docs/en/repository-boundaries.md)
- Japanese
  - [Quickstart](docs/ja/quickstart.md)
  - [Deployment](docs/ja/deployment.md)
  - [Architecture](docs/ja/architecture.md)
  - [Share Link Delivery Architecture](docs/ja/share-link-delivery.md)
  - [Concurrent Chunked Upload Design](docs/ja/concurrent-chunked-upload.md)
  - [Troubleshooting](docs/ja/troubleshooting.md)
  - [Repository Boundaries](docs/ja/repository-boundaries.md)

## Contribution and Security

- Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.
- Read `SECURITY.md` before reporting a vulnerability or discussing a security-sensitive issue.

## Security Model

- The admin workspace is private and session-protected.
- Share tokens are stored as hashes, not plaintext.
- `public_handle` is a public identifier, not a secret.
- File objects are durable by default in R2.
- Share capability can expire, be exhausted, or be revoked.
- Download responses use `Cache-Control: private, no-store`.

## Notes

- Public Git-tracked documentation uses placeholder domains only.
- Do not publish personal domains, bucket names, account identifiers, or route patterns.
- Default stable sharing uses `/h/{publicHandle}` because it is reconstructable across devices and sessions.
- Hostname-style sharing remains an optional deployment mode and may require additional certificate products.

## License

This project is released under the terms of the [GPL v3](LICENSE).

---

<div align="center">

**A small system should remain legible, auditable, and under operator control.**

Built for private file operations on the edge.  
Maintained as a Cloudflare-native reference for controlled distribution workflows.

<sub>Last updated: April 10, 2026 at 7:14 PM PDT</sub>

</div>
