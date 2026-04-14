# Development Plan

*Last updated: April 14, 2026 at 5:03 AM PDT*

## Current baseline

BurnBox 2.3.0 is now defined by five completed engineering layers:

- a stable multipart upload baseline on Cloudflare Workers, R2, and D1
- a shipped owner-account authentication layer that replaces the long-lived deployment-password model
- a shipped private-entry and upload-diagnostics baseline that makes prefixed workspace routing and upload-failure inspection operationally legible
- a completed frontend-JS maintainability pass that separates the workspace inline script into focused client modules
- a shipped resumable upload layer that makes the server the authority on confirmed part truth and allows interrupted transfers to continue without restarting from the first part

Recent validation includes successful transfers through `4.3 GB / 870 parts` and `11 GB / 2200 parts`. The resumable upload work has been validated against mid-transfer interruptions and page-refresh scenarios.

## Completed implementation

### 1. Frontend-JS maintainability pass

**Completed in 2.2.2.** The monolithic workspace script is now split into five client modules (`helpers`, `share`, `files`, `upload`, `boot-wiring`) under `src/lib/client/`. `layout.js` composes the page script from these imports. No product behavior changed.

### 2. Resume status endpoint

**Completed in 2.3.0.** `GET /api/files/upload-status?fileId=` returns the confirmed part list, plan status, total parts, and next-part pointer from durable `upload_parts` state. The server is the authority; the client does not need to track its own progress across page loads.

### 3. Client-side resume behavior

**Completed in 2.3.0.** The upload client queries upload status before starting the part loop and skips already-confirmed parts. Progress reporting is aligned to the actual resume position — skipped parts are not re-reported as uploaded. `localStorage` records the upload plan identifier, filename, file size, and chunk geometry after `init-upload`. On page refresh, selecting the same file by name and size automatically resumes the interrupted transfer using the recorded `fileId`.

### 4. Completion correctness

**Completed in 2.3.0.** Dismissing a pending resume banner calls `abort-upload`, which clears the R2 incomplete multipart and the D1 upload plan immediately. The existing `upload_parts` truth model is preserved during resumable transfers. Multipart completion remains dependent on durable server-side part records.

### 5. Operator experience hardening

**Completed in 2.3.0.**
- Claim page: required confirmation checkbox before workspace entry, setup-key source explanation for operators who did not configure `CLAIM_KEY`
- Deployment status card: visible to logged-in owners, shows private entry, workspace host, share host, `SHARE_LINK_SECRET` configuration state, recovery email, and hostname-style sharing toggle
- First-deploy guidance banner: surfaces `APP_ENTRY_PATH` configuration option when the workspace is running at the default `/` path

## Next implementation targets

The remaining near-term tracks, in priority order:

1. **Email-based account recovery** — add email-delivered recovery once a mail channel is intentionally configured; keep backup-code recovery as the emergency fallback
2. **Auto-resume after network interruption** — resume without requiring a page refresh or user interaction when a part failure is followed by a network-level reconnect (2.4.0 candidate)
3. **Cross-device resume semantics** — define what durable upload state means when a different device re-enters the same upload plan (longer-term)

## Files changed in 2.3.0

- `src/worker.js` — new `GET /api/files/upload-status` route
- `src/lib/files.js` — new `getUploadStatus()` function
- `src/lib/client/upload.js` — resume logic: upload-status query, confirmed-part skip, progress alignment
- `src/lib/client/boot-wiring.js` — `localStorage` helpers, resume banner, upload-form file-match detection
- `src/lib/layout.js` — deployment status card, first-deploy banner, `deployment` prop added to `renderAppPage`
- `src/lib/auth-layout.js` — backup-code confirmation checkbox, setup-key source hint

## What is intentionally not in scope for the first resumable pass

- cross-device recovery semantics
- background upload orchestration or auto-resume on reconnect
- large refactors of the share system
- unrelated developer-workflow expansion
