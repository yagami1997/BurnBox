# Development Plan

*Last updated: April 13, 2026 at 6:45 PM PDT*

## Current baseline

BurnBox 2.2.2 is now defined by four completed engineering layers and one remaining near-term track:

- a stable multipart upload baseline on Cloudflare Workers, R2, and D1
- a shipped owner-account authentication layer that replaces the long-lived deployment-password model
- a shipped private-entry and upload-diagnostics baseline that makes prefixed workspace routing and upload-failure inspection operationally legible
- a completed frontend-JS maintainability pass that separates the workspace inline script into focused client modules

Recent validation includes successful transfers through `4.3 GB / 870 parts` and `11 GB / 2200 parts` without the oscillation that previously appeared during long uploads.

The engineering question is now clear: the next step is reducing restart cost and uncertainty after interruption. The frontend module boundary needed for that work is now in place.

## Next implementation targets

The next formal implementation targets are:

1. ~~Frontend-JS refactoring on top of the current stable workspace baseline~~ **Completed in 2.2.2**
2. Resumable upload on top of the current multipart baseline
3. Email-based recovery and account-polish on top of the owner-account baseline

BurnBox should be able to continue an interrupted multipart transfer from durable server-side state instead of forcing a full restart after a browser error, refresh, or mid-transfer network failure.

## Planned work

### 1. Frontend-JS maintainability pass

**Completed in 2.2.2.** The monolithic workspace script is now split into five client modules (`helpers`, `share`, `files`, `upload`, `boot-wiring`) under `src/lib/client/`. `layout.js` composes the page script from these imports. No product behavior changed.

### 2. Account recovery and polish

- add email-delivered recovery once a mail channel is intentionally configured
- refine the workspace account card and auth surfaces so recovery controls remain compact and legible
- keep backup-code recovery as the emergency fallback, not the primary mental model
- preserve the current owner-claim and legacy-upgrade behavior while reducing friction in daily account management

### 3. Recovery-oriented upload protocol

- define how the client asks whether an upload plan can be resumed
- define what the server returns as durable part truth
- distinguish between recoverable plans and plans that must be reinitialized

### 4. Resume status endpoint

- add a Worker route for querying upload-plan state
- return uploaded part numbers, plan status, declared size, and chunk geometry
- keep the server as the authority on multipart truth

### 5. Client-side resume behavior

- continue from missing parts instead of restarting the full file
- survive page refresh and user re-entry into the workspace
- keep progress reporting honest when a resumed upload skips already durable parts

### 6. Completion correctness

- preserve the current `upload_parts` truth model during the first resumable implementation
- keep multipart completion dependent on durable server-side part records
- avoid introducing browser-owned completion state

### 7. Observability

- record which phase failed: part transfer, plan lookup, multipart completion, or metadata commit
- expose enough operator-visible detail to distinguish temporary transfer volatility from unrecoverable state divergence

## Files likely to change

- `src/worker.js`
- `src/lib/auth.js`
- `src/lib/session.js`
- `src/lib/files.js`
- `src/lib/layout.js`
- `src/lib/client/upload.js` — resumable upload behavior lives here
- `src/lib/client/boot-wiring.js` — resume UI wiring will land here
- `src/lib/auth-layout.js`
- `scripts/private-entry-smoke.mjs`
- a new migration if resumable state needs additional indexed metadata

## Documentation follow-up

When resumable upload lands, update at minimum:

- `README.md`
- `docs/en/architecture.md`
- `docs/en/concurrent-chunked-upload.md`
- `docs/en/quickstart.md`
- `docs/en/troubleshooting.md`
- the Japanese counterparts in `docs/ja/`

## What is intentionally not in scope for the first resumable pass

- cross-device recovery semantics
- background upload orchestration
- large refactors of the share system
- unrelated developer-workflow expansion
