# Share Link Delivery Architecture

*Last updated: April 14, 2026 at 5:03 AM PDT*

## Problem statement

BurnBox originally generated share links from the current request origin. That was simple, but it created three problems:

- public links exposed the workspace hostname
- the public and private surfaces were not clearly separated
- token-path links could not be reconstructed later on another machine

BurnBox 2.3.0 preserves the 2.1.0 and 2.1.1 share-model redesign that fixed those problems without turning the system into a larger platform.

## Design goals

- keep the admin workspace private
- let public share links live on a separate hostname
- preserve direct-download behavior for recipients
- avoid breaking older issued share links
- make active share links reconstructable from database state
- leave room for stronger privacy-oriented hostname delivery later

## Why token links were not enough

BurnBox stores only the SHA-256 hash of a share token, not the plaintext token itself.

That is the right security property for a capability URL, but it creates a side effect:

- once the share is created, the server cannot rebuild `/s/{token}` from D1

This showed up as a real operator problem:

- machine A could create a share and cache the full URL locally
- machine B could see that an active share existed
- machine B could not reconstruct the original token URL

That is why a stable public identifier became necessary.

## Why `public_handle` was introduced

`public_handle` is not a secret. It is a stable public identifier stored directly in the `shares` table.

Its job is different from the token:

- token: secret capability material for compatibility links
- `public_handle`: stable public address material for reconstructable links

This makes it possible to rebuild the current active share URL from database state and display `Copy link` consistently across devices.

## Final route choice

The preferred stable link is now:

- `https://relay.example.net/h/{publicHandle}`

This route was chosen because it satisfies all of the current constraints:

- it uses the public share domain, not the workspace domain
- it is reconstructable from D1
- it does not require wildcard certificates
- it supports cross-device operator workflows

## Why hostname-style sharing is not the default

Hostname-style links look attractive:

- `https://abc123.relay.example.net`

They can reduce visible routing semantics, but they introduce a certificate and routing cost:

- wildcard DNS is required
- wildcard Worker routes are required
- certificate coverage must also exist
- Cloudflare Universal SSL is not always enough for the deeper hostname pattern operators want to use

Because of that, BurnBox treats hostname-style delivery as an optional deployment mode rather than the default public baseline.

## Current delivery flow

1. The operator creates a share in the workspace.
2. BurnBox generates:
   - a secret token, stored only as a hash
   - a stable `public_handle`, stored directly
3. BurnBox returns a stable public URL based on the configured share domain.
4. The public request is validated on the share surface.
5. BurnBox generates a short-lived signed internal download URL.
6. The public link immediately redirects into the real download path.
7. The Worker streams the file from R2.

## Why the landing page was removed from the default path

BurnBox briefly introduced a controlled share landing page. That route helped separate view and download actions, but it was too heavy for the expected product behavior.

The final decision was:

- keep the internal signed download step
- remove the mandatory public landing page
- restore “open link, start download” as the default experience

Expired, revoked, or unavailable links still return a dedicated error response.

## Compatibility strategy

BurnBox does not invalidate older share links by default.

Current compatibility model:

- `/h/{publicHandle}` is the stable default for new operator-visible links
- `/s/{token}` continues to work for existing shares
- hostname-style links are optional and deployment-specific

This avoids a hard cutover while still moving the product toward reconstructable links.

## Host separation model

The Worker applies host-based behavior:

- workspace host:
  - serves the admin UI
  - serves authenticated `/api/*`
- share host:
  - serves public share links
  - does not expose workspace `/api/*`
  - does not expose the admin root

This separation remains one of the main privacy improvements carried forward into 2.3.0.

## Operator-facing consequences

The 2.3.0 route baseline still produces three practical outcomes:

- recipients get direct downloads again
- operators can copy an active share link from another machine
- public links no longer have to reveal the workspace hostname

## Extension points

Developers can extend this system in later versions with:

- stronger public share analytics
- one-time or nonce-backed download starts
- alternate public-share host strategies
- explicit policy for view-vs-download auditing
- optional hostname-style delivery once certificate support is intentional

What should not be changed casually:

- storing plaintext share tokens
- making private workspace and public share routing indistinguishable
- tying active-link visibility to local browser cache again
