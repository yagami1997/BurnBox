# Architecture

*Last updated: April 9, 2026 at 12:49 AM PDT*

## Overview

BurnBox is a thin Cloudflare-native application:

- Workers handle routing, session validation, upload planning, share validation, and download responses
- R2 stores file objects
- D1 stores file metadata, share metadata, and audit logs

## Upload flow

1. The admin workspace calls `POST /api/files/init-upload`
2. The Worker creates a signed R2 upload URL
3. The browser uploads the file directly to R2
4. The workspace calls `POST /api/files/complete-upload`
5. The Worker confirms the object exists and writes metadata to D1

## Share flow

1. The admin workspace creates a share record for a file
2. The Worker generates a random token and stores only its hash
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

### `audit_logs`

- actor
- action
- target type
- target id
- metadata
- timestamp
