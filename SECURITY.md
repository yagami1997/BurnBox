# Security Policy

*Last updated: April 12, 2026 at 8:39 PM PDT*

## Supported scope

Security issues are relevant for:

- session handling
- share-token generation and validation
- R2 upload and download flows
- D1 metadata integrity
- access revocation behavior
- cache behavior on protected responses

## Reporting guidance

Please do not open a public issue for a suspected vulnerability that could expose files, sessions, or share links.

Instead, report enough information for reproduction in a private channel controlled by the maintainer. Include:

- affected area
- reproduction steps
- expected impact
- configuration assumptions

## Routing boundary

This document covers security issues in the BurnBox source project itself.

Do not use this security channel for:

- copyright complaints about files hosted on a third-party BurnBox deployment
- abuse reports concerning a third-party share link or operator instance
- privacy or content-removal requests directed at an independently operated deployment

Those notices must be sent to the operator of the specific deployment that stores or serves the content. BurnBox is published as self-hosted source code, and the upstream maintainer does not operate third-party instances.

## Hardening model

BurnBox follows several baseline controls:

- admin access is session-protected
- share tokens are stored as hashes
- downloads are delivered with `Cache-Control: private, no-store`
- file durability is separated from temporary access capability
- revocation and download exhaustion are treated as first-class invalidation states

## Out of scope

The following are not security bugs in BurnBox itself:

- misconfigured Cloudflare account permissions
- leaked secrets committed outside this repository's templates
- unsafe bucket CORS policies chosen by an operator
- insecure local workstation practices
