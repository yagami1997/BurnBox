# Architecture

*Last updated: April 12, 2026 at 6:31 PM PDT*

## Overview

BurnBox is a compact Cloudflare-native control plane:

- Workers handle routing, session validation, upload coordination, share validation, and download responses
- R2 stores file objects
- D1 stores file metadata, upload state, share state, and audit logs

BurnBox 2.2.0 has three major architectural layers:

- upload reliability through chunked multipart ingest
- share-delivery separation through split domains and stable public handles
- workspace account security through owner claim, upgrade flow, and in-product session control

The current engineering baseline has been validated through large transfers up to `4.3 GB / 870 parts` and `11 GB / 2200 parts`. BurnBox 2.2.0 now ships owner-claim auth, legacy upgrade flow, and in-product account security on top of that baseline. The next implementation step is resumable upload.

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
- recovery email and backup codes give the workspace a product-level recovery model instead of a deployment-secret fallback

## Upload flow

1. The owner workspace calls `POST /api/files/init-upload`.
2. The Worker creates an upload plan in D1.
3. The browser slices the file into 5 MiB chunks.
4. Each chunk is sent through the Worker upload channel.
5. The Worker assembles the final object in R2 using multipart upload.
6. The workspace calls `POST /api/files/complete-upload`.
7. The Worker finalizes object assembly and writes the final file record to D1.

This flow is intentionally stateful. The difficulty is not only moving bytes into R2. The difficulty is preserving correct system state across many part requests, retries, and a final commit boundary.

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

BurnBox 2.2.0 also adds security controls around the new auth layer:

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
- recovery email
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
