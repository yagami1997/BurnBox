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

- [What It Does](#what-it-does)
- [Stack](#stack)
- [Changelog](#-changelog)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Documentation](#documentation)
- [Security Model](#security-model)
- [Legal Position](#legal-position)
- [Notes](#notes)
- [License](#license)

## What It Does

BurnBox is a private operator workspace for file storage and controlled distribution. It is not a public upload site.

- files live in R2 storage you own and control
- external access is a revocable capability link, not a permanent URL
- administration happens in a private workspace behind owner-account authentication
- expiration, download limits, and revocation are first-class controls

The public link does not expose your admin surface. The admin surface does not expose your public links. They run on separate domains and evolve independently.

![BurnBox workspace overview](docs/assets/ScreenShot_2026-04-13_121901_413.png)

## Stack

- Cloudflare Workers — routing, session enforcement, upload coordination, share validation, response delivery
- Cloudflare R2 — durable object storage with native Workers multipart binding
- Cloudflare D1 — file metadata, upload state, share state, audit records
- Server-rendered HTML, CSS, and JavaScript — no build step, no frontend framework, minimal deployment surface

## 📋 Changelog

### April 14, 2026 · BurnBox 2.3.0 Resumable Upload Release · 5:03 AM PDT

- adds `GET /api/files/upload-status` — a server-side query endpoint that returns confirmed part numbers, plan status, and next-part pointer from durable `upload_parts` state; the server is the authority on multipart truth, not the browser
- client now queries upload status before starting the part loop; already-confirmed parts are skipped and progress reporting is aligned to the actual resume position
- `localStorage` records the `fileId`, filename, file size, and chunk geometry after `init-upload`; on page refresh the workspace detects a pending record and shows a resume banner
- resume is triggered naturally: selecting the same file (matched by name and size) in the upload form automatically uses the existing `fileId` and resumes from the confirmed breakpoint — no separate file picker or extra interaction
- dismissing a pending resume banner calls `abort-upload`, cleaning up the R2 incomplete multipart and the D1 upload plan immediately rather than waiting for R2's automatic expiry
- adds Claim-page UX hardening: a required confirmation checkbox before `Enter workspace` becomes active, and a setup-key source explanation for operators who did not configure `CLAIM_KEY`
- adds a Deployment status card visible to logged-in owners: shows private entry path, workspace host, share host, `SHARE_LINK_SECRET` configuration state with a warning when absent, recovery email, and hostname-style sharing toggle
- adds a dismissible first-deploy guidance banner when `APP_ENTRY_PATH` is not configured, surfacing the configuration option for operators who did not know it existed

Developer guidance for this release:

- [Quickstart](docs/en/quickstart.md)
- [Deployment](docs/en/deployment.md)
- [Architecture](docs/en/architecture.md)
- [Development Plan](docs/en/development-plan.md)
- [Documentation index](docs/README.md)

<details>
<summary>Older changelog entries</summary>

### April 13, 2026 · BurnBox 2.2.2 Frontend JS Refactor · 6:45 PM PDT

- separates the monolithic workspace inline script into five focused client modules: `helpers`, `share`, `files`, `upload`, and `boot-wiring`
- `layout.js` now composes the page script from imported modules instead of carrying all frontend JS detail inline
- preserves `boot.apiBase` and `boot.appEntryPath` as the sole source of private API paths — no bare `/api/...` strings reintroduced
- keeps Logout, Refresh, Upload, share create/revoke, and all account security actions stable under prefixed private-entry routes
- no product behavior changes, no new API routes, no new capabilities — structural maintainability pass only
- establishes a cleaner frontend module boundary ahead of the resumable upload work in 2.3.0

### April 13, 2026 · BurnBox 2.2.1 Upload Diagnostics and Private Entry Release · 6:06 AM PDT

- ships deployment-managed private workspace entry support through `APP_ENTRY_PATH`
- moves private workspace pages and private API routes under the derived private entry prefix instead of exposing the admin surface at the root path by default
- adds operator-visible `Private entry` display inside the workspace without making the route editable from the UI
- adds upload-diagnostics aggregation for unfinished or failed uploads so operators can inspect multipart progress from durable server-side state
- hardens multipart consistency with explicit abort cleanup on failed uploads and compensating object deletion when metadata commit fails after multipart completion
- adds a private-entry smoke check to keep prefixed workspace routing from regressing
- keeps the owner-account auth baseline from 2.2.0 intact while preparing a smaller frontend-JS refactor before resumable upload

Developer guidance for this release:

- [Quickstart](docs/en/quickstart.md)
- [Deployment](docs/en/deployment.md)
- [Architecture](docs/en/architecture.md)
- [Development Plan](docs/en/development-plan.md)
- [Release Checklist](docs/en/release-checklist.md)
- [Troubleshooting](docs/en/troubleshooting.md)
- [Documentation index](docs/README.md)

### April 12, 2026 · BurnBox 2.2.0 Owner Account and Security Upgrade · 8:36 PM PDT

- ships owner-account authentication inside the product instead of relying on a long-lived deployment password
- adds `Claim your BurnBox` for first-run setup and `Upgrade your BurnBox security` for legacy `ADMIN_PASSWORD` deployments
- moves password change, recovery-email management, backup-code regeneration, logout, and device-session control into the workspace
- hardens auth behavior with generic invalid-credential logging, recovery lockouts, legacy-login throttling, claim-token atomicity, and password-hash sanitization
- keeps public share delivery, multipart upload, and stable `/h/{publicHandle}` links intact while upgrading the workspace auth model
- refreshes the public README and operator docs so deployment, migration, upgrade, and recovery behavior all describe the shipped 2.2.0 system
- adds a legal-risk documentation baseline that clarifies BurnBox as a self-hosted tool author project and assigns deployment compliance duties to instance operators

Developer guidance for this release:

- [Quickstart](docs/en/quickstart.md)
- [Deployment](docs/en/deployment.md)
- [Architecture](docs/en/architecture.md)
- [Development Plan](docs/en/development-plan.md)
- [Release Checklist](docs/en/release-checklist.md)
- [Documentation index](docs/README.md)

### April 11, 2026 · BurnBox 2.1.1 Reliability and Research Release · 12:18 PM PDT

- moved multipart assembly fully onto native Workers R2 APIs and removed the extra S3-compatible signing hop
- clarified retry ownership so transient recovery lives in the client instead of expanding Worker execution paths
- tightened multipart completion behavior and reduced avoidable per-part coordination overhead
- validated stable multipart transfers from `419` parts through `4.3 GB / 870 parts` and `11 GB / 2200 parts`, reinforcing the cumulative-reliability diagnosis
- rewrote the public docs to explain why large-file edge upload is a stateful systems problem rather than a simple timeout problem
- established three graduate-level research directions for the project: resumable multipart protocols, cost-aware coordination state, and capability-oriented public distribution
- established resumable upload as the next engineering baseline to reduce restart cost after interruption
- refined public-facing failure interaction so external entry points now present tighter and more consistent error behavior under invalid or unavailable requests

Developer guidance for this release:

- [Concurrent Chunked Upload Design](docs/en/concurrent-chunked-upload.md)
- [Architecture](docs/en/architecture.md)
- [Share Link Delivery Architecture](docs/en/share-link-delivery.md)
- [Development Plan](docs/en/development-plan.md)
- [Documentation index](docs/README.md)

### April 10, 2026 · BurnBox 2.1.0 Share-Domain Release · 7:14 PM PDT

- shipped split-domain sharing with a private workspace domain and a public share domain
- introduced `public_handle` as the stable public identifier for share links
- changed the default stable share URL to `https://relay.example.net/h/{publicHandle}`
- kept legacy `/s/{token}` links for compatibility instead of breaking existing shares
- removed the mandatory share landing page from the default flow and restored direct-download behavior
- fixed cross-device `Copy link` behavior by making active share URLs reconstructable on the server
- documented Cloudflare DNS, route, and certificate constraints for hostname-style sharing

### April 9, 2026 · BurnBox 2.0.0 Major Refactor and Chunked Upload Rollout · 5:42 AM PDT

- rebuilt BurnBox around a single Cloudflare Worker, R2, and D1 architecture
- replaced the legacy public-upload flow with a private admin workspace
- introduced signed admin sessions and hashed share-token storage
- redesigned the interface, share controls, and documentation structure for public release
- moved the upload path from optimistic single-request transfer to a chunked multipart model
- adopted 5 MiB chunk slicing for stability-first transfer behavior
- added D1-backed upload plans and uploaded-part tracking

</details>

## Architecture

BurnBox 2.3.0 is organized around six layers:

**1. Split-domain delivery**
A private workspace domain (`console.example.com`) handles authenticated operations. A public share domain (`relay.example.net`) handles external file delivery. The two domains share one Worker but serve different route surfaces.

**2. Private-entry routing**
The workspace and all authenticated API routes can be moved behind a deployment-managed prefix such as `/ops` via `APP_ENTRY_PATH`. The prefix changes where the admin surface lives without changing product behavior.

**3. Owner-account authentication**
New deployments complete a one-time claim flow inside the product. Legacy deployments upgrade from a deployment password to a full owner account. Password rotation, backup codes, optional recovery email, and session reset all live inside the workspace — not in environment variables.

**4. Chunked multipart upload**
Files are sliced into 5 MiB parts and assembled via R2 native multipart APIs. Upload state is persisted in D1 so the server can reason about part truth independently of the browser. Client-side retry handles transient failures with exponential backoff; the Worker execution path stays short.

**5. Frontend module separation**
The workspace client script is organized into five focused modules: `helpers`, `share`, `files`, `upload`, and `boot-wiring`. All API paths are derived from `boot.apiBase` — no bare `/api/...` strings exist in client code.

**6. Resumable upload**
The server holds confirmed part truth in `upload_parts`. On upload start or re-entry, the client queries `GET /api/files/upload-status` to retrieve already-confirmed parts and skips them, resuming from the first missing position. `localStorage` records the upload plan identifier after initialization. On page refresh, selecting the same file by name and size automatically resumes the interrupted transfer — no separate interaction required.

The current share model uses stable `public_handle` identifiers reconstructable from D1 state, which fixes the cross-device `Copy link` problem that token-hash-only storage could not solve.

<details>
<summary>Design notes on engineering difficulty</summary>

BurnBox looks small at the repository level. Its hardest problem is not UI or routing — it is edge-native large-file transfer under real network volatility.

One upload expands into a long-lived distributed pipeline: browser slicing, repeated Worker requests across hundreds of parts, R2 multipart assembly, D1 state bookkeeping, and a final readiness transition. For small files many design mistakes stay invisible. For larger artifacts they become operator-visible faults.

The practical lesson: large-file upload on the edge is not one request that happens to be bigger. It is a multi-stage reliability problem whose failure probability accumulates with every additional part. BurnBox has validated stable completion through `4.3 GB / 870 parts` and `11 GB / 2200 parts`.

Common misconceptions that produce the wrong fixes:

- large uploads do not usually fail because of one mysterious size threshold
- network instability is not a frontend-only problem
- transfer completion is not the same as file readiness
- adding retries is not the same as building a recoverable upload protocol
- edge infrastructure does not remove the need for explicit intermediate state

Read more: [Architecture](docs/en/architecture.md) · [Concurrent Chunked Upload Design](docs/en/concurrent-chunked-upload.md)

</details>

<details>
<summary>Research directions</summary>

BurnBox is also a compact research vehicle for edge-native file control systems.

### 1. Resumable Multipart Protocols for Edge-Controlled Upload

How should a Worker-mediated upload protocol represent partial truth so that a large transfer can resume from failure without trusting the browser as the source of record and without forcing a whole-upload restart?

### 2. Cost-Aware State Coordination for High-Part-Count Object Transfer

What is the minimum persistent coordination state required to preserve correctness for multipart upload on the edge when part counts become large and per-part state writes begin to dominate reliability or cost?

### 3. Capability-Oriented Distribution and Operator-Controlled Public Reach

How can edge-native file systems separate durability, public reach, and revocation into independently controllable layers without collapsing back into either fully public storage or opaque backend mediation?

The project's thesis is that edge reliability is usually not blocked by missing infrastructure primitives. It is blocked by weak state models, misleading progress semantics, and under-specified recovery behavior.

</details>

## Project Structure

```
src/
  worker.js                   Worker entrypoint and route handling
  lib/
    http.js                   response helpers, cookie parsing, timing-safe comparison
    audit.js                  audit log write helper
    auth.js                   owner auth, password hashing, claim, upgrade, recovery
    session.js                signed session handling
    files.js                  upload planning, part upload, multipart completion, deletion
    shares.js                 share creation, revoke, view/download resolution
    repository.js             file list query layer and active share projection
    layout.js                 workspace page rendering, composes client modules
    auth-layout.js            claim, sign-in, upgrade, and recovery page rendering
    client/
      helpers.js              global state, DOM refs, apiUrl(), formatBytes, status helpers
      share.js                share link storage, sync, composer open/close, copy
      files.js                file table rendering, event delegation for all file actions
      upload.js               chunked upload, per-part retry with exponential backoff
      boot-wiring.js          init block, all event listeners, boot coordination

migrations/
  0001_initial.sql            initial D1 schema
  0002_upload_plans.sql       upload plan table
  0003_multipart_uploads.sql  multipart upload state extensions
  0004_share_public_handle.sql stable public share handle support
  0005_owner_auth.sql         owner account, claim token, recovery code, auth events
```

## Quick Start

If you want an AI assistant to carry out the setup with you, use the handoff file first: [AI Deployment Handoff](docs/en/ai-deployment-handoff.md)

**Before you begin, decide two things:**

1. `APP_ENTRY_PATH` — serve the private workspace at `/` or behind a prefix like `/ops`
2. Recovery path — backup codes only, or backup codes plus a recovery email

**Setup steps:**

```bash
npm install
```

Copy `wrangler.toml.template` to `wrangler.toml` and fill in your Worker name, D1 database id, R2 bucket name, workspace hostname, and share hostname.

Apply the schema:

```bash
npx wrangler d1 execute <your-d1-database-name> --remote --file=./migrations/0001_initial.sql
npx wrangler d1 execute <your-d1-database-name> --remote --file=./migrations/0002_upload_plans.sql
npx wrangler d1 execute <your-d1-database-name> --remote --file=./migrations/0003_multipart_uploads.sql
npx wrangler d1 execute <your-d1-database-name> --remote --file=./migrations/0004_share_public_handle.sql
npx wrangler d1 execute <your-d1-database-name> --remote --file=./migrations/0005_owner_auth.sql
```

Configure secrets:

```bash
npx wrangler secret put SESSION_SECRET
npx wrangler secret put SHARE_LINK_SECRET
npx wrangler secret put CLAIM_KEY
```

`SHARE_LINK_SECRET` is required — public share downloads will fail with `503` without it. Keep `SESSION_SECRET` and `SHARE_LINK_SECRET` as separate values. `CLAIM_KEY` is a one-time setup key, not the long-lived owner password; omit it to use a log-generated claim code instead.

```bash
npm run deploy
```

After deploy: complete `Claim your BurnBox` (new deployment) or `Upgrade your BurnBox security` (legacy). **Save the backup codes before closing the browser — they are shown once.**

## Documentation

- [Documentation index](docs/README.md)

English:
[AI Deployment Handoff](docs/en/ai-deployment-handoff.md) ·
[Quickstart](docs/en/quickstart.md) ·
[Deployment](docs/en/deployment.md) ·
[Architecture](docs/en/architecture.md) ·
[Share Link Delivery Architecture](docs/en/share-link-delivery.md) ·
[Concurrent Chunked Upload Design](docs/en/concurrent-chunked-upload.md) ·
[Development Plan](docs/en/development-plan.md) ·
[Troubleshooting](docs/en/troubleshooting.md) ·
[Legal Risk Statement](docs/en/legal-risk-statement.md) ·
[Repository Boundaries](docs/en/repository-boundaries.md)

Japanese:
[AI デプロイ引き継ぎ](docs/ja/ai-deployment-handoff.md) ·
[クイックスタート](docs/ja/quickstart.md) ·
[デプロイ](docs/ja/deployment.md) ·
[アーキテクチャ](docs/ja/architecture.md) ·
[共有リンク配信](docs/ja/share-link-delivery.md) ·
[並行チャンク分割アップロード](docs/ja/concurrent-chunked-upload.md) ·
[開発計画](docs/ja/development-plan.md) ·
[トラブルシューティング](docs/ja/troubleshooting.md) ·
[法的リスク声明](docs/ja/legal-risk-statement.md) ·
[リポジトリ境界](docs/ja/repository-boundaries.md)

## Security Model

- owner passwords are hashed with PBKDF2 and never returned to the client
- sessions are HMAC-signed with expiry; the workspace is private and session-protected
- share tokens are stored as hashes, not plaintext; `public_handle` is a public identifier, not a secret
- recovery-code reset is rate-limited and returns generic failure responses
- legacy upgrade login is throttled so the transitional password path is not left unbounded
- share capability can expire, be exhausted, or be revoked at any time
- download responses use `Cache-Control: private, no-store`
- the public share domain does not expose authenticated API routes or the workspace root

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Read [SECURITY.md](SECURITY.md) before reporting a vulnerability.

## Legal Position

BurnBox is self-hosted source code, not a hosted service. The project author does not operate third-party deployments and accepts no liability for how forks or instances are used.

**Before you fork or deploy BurnBox, read the full [Legal Risk Statement](docs/en/legal-risk-statement.md) and [Repository Boundaries](docs/en/repository-boundaries.md).** These documents exist because the obligations of running a file-distribution system are real and vary significantly by jurisdiction. Do not skip them.

If you fork, deploy, or operate a BurnBox instance — especially one that serves other people's files or is accessible to the public — you are responsible for:

- conducting your own legal assessment of applicable laws in your jurisdiction before deployment
- complying with all relevant local, national, and international laws and regulations
- data protection and privacy obligations (such as GDPR, PIPL, or equivalent frameworks)
- copyright, takedown, and notice-and-action requirements
- establishing and publishing an operator contact route for abuse and legal inquiries (`abuse@your-domain.example`)
- any platform terms of service imposed by your infrastructure providers

**BurnBox must be used strictly in accordance with the laws of your jurisdiction. Operating an instance in a legally non-compliant manner is solely the responsibility of the operator, not the upstream project.**

Abuse or legal complaints about content on a third-party BurnBox deployment must go to the operator of that deployment, not to this repository. This project does not have visibility into, control over, or responsibility for the content of any third-party instance.

## Notes

Every version of BurnBox has answered a different question.

The first was whether large files could move through the edge at all. They could — but the lesson was not about bandwidth. It was about state. A system that cannot articulate what it knows after a failure cannot recover from one. Reliability is not a timeout problem. It is a state problem.

The second was about identity. A share link is a capability — bounded, revocable, attached to a specific act of trust. When a link's stable identity and its secret material collapse into the same thing, the system loses the ability to say clearly who still has access and why. Separating `public_handle` from the token hash was not a refactor. It was a clarification of what kind of thing a link is.

The third was about ownership. A deployment password in an environment variable is not an owner. It is a shared secret with no memory, no recovery path, and no face. Moving authentication into the product was an attempt to give the workspace something closer to a person at the other end of it.

The fourth was about recovery. An interrupted upload is not a failed request — it is a system in a partially-committed state. The browser's memory of the transfer does not survive a page refresh. The server's record of each confirmed part does. The answer was to make the server the authority on part truth, and to let the client ask what the server already knows before deciding what remains to be done. That is not a clever trick. It is the only design that keeps recovery honest.

What remains is the question of time — whether a system that has paused for hours or days can resume as confidently as one that paused for seconds. That is a harder problem, and one that will require the system to say something more precise about when a partial state is still worth returning to.

A small system should remain legible to a single careful reader. That is not a constraint. It is the point.

---

The Japanese documentation is a small gesture toward the idea that technical work should be readable in more than one language. To the friends at Kyoto University who made that feel worthwhile — thank you.

## License

This project is released under the terms of the [GPL v3](LICENSE).

---

<div align="center">

<sub>Last updated: April 13, 2026 at 7:20 PM PDT</sub>

</div>
