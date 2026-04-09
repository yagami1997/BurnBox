# Architecture

*Last updated: April 9, 2026 at 5:42 AM PDT*

## Overview

BurnBox is a compact Cloudflare-native control plane:

- Workers handle routing, session validation, upload coordination, share validation, and download responses
- R2 stores file objects
- D1 stores file metadata, upload state, share state, and audit logs

## Core architectural shift

The most important technical decision in BurnBox 2.0.0 is the move away from direct single-request object writes and toward a chunked multipart upload architecture.

That shift matters because BurnBox is used for real operator files such as installers, archives, and binary artifacts, not just small demo payloads. In practice, a control-plane tool like this needs upload stability more than it needs the fewest possible moving parts.

For the detailed rationale, see [Concurrent Chunked Upload Design](concurrent-chunked-upload.md).

## Upload flow

1. The admin workspace calls `POST /api/files/init-upload`
2. The Worker creates an upload plan in D1
3. The browser slices the file into 5 MiB chunks
4. Each chunk is sent through the Worker upload channel
5. The Worker assembles the final object in R2 using multipart upload
6. The workspace calls `POST /api/files/complete-upload`
7. The Worker finalizes object assembly and writes the final file record to D1

## Why the upload flow is structured this way

- chunking reduces the blast radius of transient network failures
- multipart assembly avoids depending on a single large write
- upload planning keeps the storage key under server control
- the finalization step separates transfer completion from metadata readiness
- the progress model can reflect real transfer state instead of pretending that one request equals one durable outcome

## Share flow

1. The admin workspace creates a share record for a file
2. The Worker generates a random token and stores only its SHA-256 hash
3. The user opens `/s/:token`
4. The Worker validates share state:
   - not revoked
   - not expired
   - not over the download limit
5. The Worker streams the file from R2

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
