# Development Plan

*Last updated: April 11, 2026 at 9:29 PM PDT*

## Current baseline

BurnBox 2.1.1 has established a stable multipart upload baseline on Cloudflare Workers, R2, and D1.

Recent validation includes successful transfers through `4.3 GB / 870 parts` and `11 GB / 2200 parts` without the oscillation that previously appeared during long uploads.

That changes the engineering question. The next step is no longer proving that large-file upload is feasible. The next step is reducing restart cost and uncertainty after interruption.

## Next implementation target

The next formal implementation target is resumable upload.

BurnBox should be able to continue an interrupted multipart transfer from durable server-side state instead of forcing a full restart after a browser error, refresh, or mid-transfer network failure.

## Planned work

### 1. Recovery-oriented upload protocol

- define how the client asks whether an upload plan can be resumed
- define what the server returns as durable part truth
- distinguish between recoverable plans and plans that must be reinitialized

### 2. Resume status endpoint

- add a Worker route for querying upload-plan state
- return uploaded part numbers, plan status, declared size, and chunk geometry
- keep the server as the authority on multipart truth

### 3. Client-side resume behavior

- continue from missing parts instead of restarting the full file
- survive page refresh and user re-entry into the workspace
- keep progress reporting honest when a resumed upload skips already durable parts

### 4. Completion correctness

- preserve the current `upload_parts` truth model during the first resumable implementation
- keep multipart completion dependent on durable server-side part records
- avoid introducing browser-owned completion state

### 5. Observability

- record which phase failed: part transfer, plan lookup, multipart completion, or metadata commit
- expose enough operator-visible detail to distinguish temporary transfer volatility from unrecoverable state divergence

## Files likely to change

- `src/worker.js`
- `src/lib/files.js`
- `src/lib/layout.js`
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
