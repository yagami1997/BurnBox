# Architecture

*Last updated: April 14, 2026 at 5:03 AM PDT*

## Overview

BurnBox is a compact Cloudflare-native control plane:

- Workers handle routing, session validation, upload coordination, share validation, and download responses
- R2 stores file objects
- D1 stores file metadata, upload state, share state, and audit logs

BurnBox 2.3.0 has six major architectural layers:

- upload reliability through chunked multipart ingest
- share-delivery separation through split domains and stable public handles
- workspace account security through owner claim, upgrade flow, and in-product session control
- private workspace route isolation plus operator-visible upload diagnostics
- frontend module separation — the workspace inline script is now composed from focused client modules under `src/lib/client/`
- resumable upload — the server holds confirmed part truth; the client queries it on re-entry and resumes from the first missing part without restarting the transfer

The current engineering baseline has been validated through large transfers up to `4.3 GB / 870 parts` and `11 GB / 2200 parts`. BurnBox 2.3.0 completes the resumable upload layer on top of the 2.2.2 frontend-module baseline.

One practical warning belongs at the architectural level:

large-file behavior in BurnBox should be reasoned about as cumulative reliability, not as a single-request size problem.

## Core architectural shifts

### 2.0.0: upload reliability

The first major architectural shift was moving away from single-request uploads toward chunked multipart upload. That change made BurnBox usable for larger installers, archives, and binary artifacts.

Detailed rationale:

- [Concurrent Chunked Upload Design](concurrent-chunked-upload.md)

### 2.1.1: reliability hardening on top of the share-delivery redesign

The second major shift was redesigning the share system so that:

- public links no longer need to expose the workspace hostname
- active links can be reconstructed across devices
- hostname-style sharing remains possible without forcing it as the baseline

Detailed rationale:

- [Share Link Delivery Architecture](share-link-delivery.md)

### 2.2.0: owner claim and account-security transition

The third major shift is moving workspace authentication from a deployment-password pattern toward a product-level owner account:

- new deployments enter an owner-claim flow
- existing deployments can migrate through an upgrade flow
- password change, recovery, and device/session controls move into the workspace
- the long-lived workspace password no longer belongs in deployment configuration
- backup codes give the workspace a product-level recovery baseline instead of a deployment-secret fallback, while recovery email remains optional per operator policy

### 2.3.0: resumable upload

The sixth major shift makes the server the authority on confirmed part truth and gives the client a recovery path after interruption:

- `GET /api/files/upload-status` returns the confirmed part list, plan status, total parts, and next-part pointer from durable `upload_parts` state
- the client queries this endpoint before starting the part loop and skips already-confirmed parts; progress reporting is aligned to the actual resume position
- `localStorage` records the upload plan identifier after `init-upload`; on page refresh, selecting the same file by name and size triggers automatic resume without additional interaction
- dismissing a pending resume banner calls `abort-upload`, cleaning up the R2 incomplete multipart and D1 upload plan immediately

The design position: the browser is an execution endpoint, not a state authority. An interrupted upload is a partially-committed system state, not a failed request. Recovery requires asking what the server knows — not restarting from zero.

### 2.2.2: frontend module separation

The fifth major shift is a structural maintainability pass on the workspace UI layer:

- the monolithic inline script previously embedded in `layout.js` is now split into five client modules: `helpers`, `share`, `files`, `upload`, and `boot-wiring`
- `layout.js` composes the page script from these imported modules rather than carrying all frontend JS inline
- `boot.apiBase` and `boot.appEntryPath` remain the sole source of private API paths — no bare `/api/...` paths are reintroduced
- no product behavior changes; this is a prerequisite for the resumable upload work in 2.3.0

### 2.2.1: private-entry routing and upload observability

The fourth major shift is operational hardening around the existing private workspace:

- deployments may place the private workspace behind a deployment-managed route prefix such as `/ops`
- private HTML routes and authenticated `/api/*` routes derive from the same server-controlled prefix
- the workspace renders a read-only private-entry indicator instead of making routing editable in-product
- upload diagnostics expose server-side multipart progress for unfinished or failed uploads
- failed uploads now have an explicit abort path, and metadata-commit failure after multipart completion triggers compensating object deletion

## Upload flow

1. The owner workspace calls `POST /api/files/init-upload`.
2. The Worker creates an upload plan in D1 and returns the `fileId` and chunk geometry.
3. The client queries `GET /api/files/upload-status` to retrieve already-confirmed parts from D1.
4. The browser slices the file into 5 MiB chunks; already-confirmed parts are skipped.
5. Each remaining chunk is sent through the Worker upload channel; the Worker records a confirmed part in `upload_parts` after each successful R2 write.
6. The workspace calls `POST /api/files/complete-upload`.
7. The Worker validates that all parts are present and contiguous, finalizes the R2 multipart object, and writes the final file record to D1.

On page refresh or re-entry, the client detects a pending `localStorage` record, shows a resume banner, and resumes from step 3 when the same file is selected — no new `init-upload` is issued.

This flow is intentionally stateful. The difficulty is not only moving bytes into R2. The difficulty is preserving correct system state across many part requests, retries, interruptions, and a final commit boundary.

## Share flow

1. The owner workspace creates a share record for a file.
2. The Worker generates:
   - a secret token, stored only as a SHA-256 hash
   - a stable `public_handle`, stored in D1
3. The Worker returns a stable public URL on the configured share domain.
4. A public request arrives on the share surface.
5. The Worker validates share state:
   - not revoked
   - not expired
   - not over the download limit
6. The Worker creates a short-lived signed internal download URL.
7. The share request immediately redirects into the real download path.
8. The Worker streams the file from R2.

## Why the share flow is structured this way

- hashed tokens preserve capability secrecy
- `public_handle` makes active links reconstructable
- split domains reduce public exposure of the admin surface
- the internal signed download hop keeps a control point without forcing a public landing page
- legacy token links remain valid so existing issued links do not break

## Auth flow

1. A request arrives on the workspace host.
2. The Worker determines the auth state:
   - `unclaimed`
   - `upgrade_required`
   - `active`
3. New deployments are routed into owner claim.
4. Legacy deployments can authenticate once with the old deployment password and then enter the upgrade flow.
5. Active deployments authenticate against the owner account and session state.
6. Password change, recovery, and sign-out-all invalidate prior sessions through a server-controlled session version.

## Auth hardening notes

BurnBox 2.2.0 and 2.2.1 together add security controls around the new auth and routing layer:

- failed owner sign-ins record a generic invalid-credentials reason
- legacy upgrade login is rate-limited
- recovery-code reset is rate-limited and uses generic failure responses
- claim-token use is atomic with owner-account creation
- auth/session payloads never expose password hashes

## Host separation model

BurnBox distinguishes between two public surfaces:

- workspace host
  - admin HTML
  - authenticated `/api/*`
- share host
  - public share URLs
  - no admin UI
  - no authenticated API surface

This split is enforced in the Worker route layer.

## Data model

### `files`

- file identity
- storage key
- file size and content type
- tags and note
- timestamps

### `shares`

- file reference
- token hash
- `public_handle`
- expiration
- max downloads
- current download count
- revocation timestamp

### `upload_plans`

- upload identity
- server-controlled storage key
- declared file size
- chunk size
- multipart upload id
- upload status
- timestamps

### `upload_parts`

- upload plan reference
- part number
- ETag
- part size
- timestamps

### `audit_logs`

- actor
- action
- target type
- target id
- metadata
- timestamp

### `owner_account`

- owner identity
- password hash and algorithm
- optional recovery email
- session version
- timestamps

### `claim_tokens`

- token hash
- source (log-generated or env-provided)
- used timestamp

### `password_reset_tokens`

- token hash
- expiration
- used timestamp

### `recovery_codes`

- owner reference
- code hash
- used timestamp

### `auth_events`

- event type
- actor
- ip address
- detail json
- timestamp
