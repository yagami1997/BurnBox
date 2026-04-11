# Architecture

*Last updated: April 10, 2026 at 7:14 PM PDT*

## Overview

BurnBox is a compact Cloudflare-native control plane:

- Workers handle routing, session validation, upload coordination, share validation, and download responses
- R2 stores file objects
- D1 stores file metadata, upload state, share state, and audit logs

BurnBox 2.1.0 has two major architectural layers:

- upload reliability through chunked multipart ingest
- share-delivery separation through split domains and stable public handles

## Core architectural shifts

### 2.0.0: upload reliability

The first major architectural shift was moving away from single-request uploads toward chunked multipart upload. That change made BurnBox usable for larger installers, archives, and binary artifacts.

Detailed rationale:

- [Concurrent Chunked Upload Design](concurrent-chunked-upload.md)

### 2.1.0: share-delivery redesign

The second major shift was redesigning the share system so that:

- public links no longer need to expose the workspace hostname
- active links can be reconstructed across devices
- hostname-style sharing remains possible without forcing it as the baseline

Detailed rationale:

- [Share Link Delivery Architecture](share-link-delivery.md)

## Upload flow

1. The admin workspace calls `POST /api/files/init-upload`.
2. The Worker creates an upload plan in D1.
3. The browser slices the file into 5 MiB chunks.
4. Each chunk is sent through the Worker upload channel.
5. The Worker assembles the final object in R2 using multipart upload.
6. The workspace calls `POST /api/files/complete-upload`.
7. The Worker finalizes object assembly and writes the final file record to D1.

## Share flow

1. The admin workspace creates a share record for a file.
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
