# Security Policy

*Last updated: April 14, 2026 at 6:29 PM PDT*

## Supported scope

Security issues are relevant for:

- owner-account claim, upgrade, login, and recovery flows
- session handling
- private workspace route isolation and deployment-managed entry configuration
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

## Operator compliance expectation

Security in BurnBox is not limited to code defects. Anyone forking, deploying, or extending the project is expected to operate it lawfully and with a high degree of compliance awareness.

That includes:

- complying with applicable cybersecurity, copyright, data-protection, and file-sharing rules in the jurisdictions where the system is developed, deployed, or exposed
- evaluating whether a deployment model creates operator obligations for notice handling, access control, record retention, privacy compliance, or unlawful-content response
- refusing deployment or downstream changes that rely on infringement, unauthorized access, or evasion of lawful restrictions

BurnBox is meant for lawful private file management and controlled sharing. It is not intended for operators who are unwilling to meet the legal responsibilities of running such a system.

## Routing boundary

This document covers security issues in the BurnBox source project itself.

Do not use this security channel for:

- copyright complaints about files hosted on a third-party BurnBox deployment
- abuse reports concerning a third-party share link or operator instance
- privacy or content-removal requests directed at an independently operated deployment

Those notices must be sent to the operator of the specific deployment that stores or serves the content. BurnBox is published as self-hosted source code, and the upstream maintainer does not operate third-party instances.

For the broader legal and compliance boundary of the project, read the repository's legal risk guidance in `docs/en/legal-risk-statement.md`.

## Hardening model

BurnBox follows several baseline controls:

- owner workspace access is session-protected
- owner password material is stored as a hash, not as plaintext
- owner-session invalidation is controlled through session-version checks
- share tokens are stored as hashes
- downloads are delivered with `Cache-Control: private, no-store`
- file durability is separated from temporary access capability
- revocation and download exhaustion are treated as first-class invalidation states
- share download signing uses a dedicated `SHARE_LINK_SECRET` isolated from the session secret
- all responses carry security headers: `X-Frame-Options`, `Content-Security-Policy`, `Strict-Transport-Security`
- authentication events, failed logins, and file operations are logged to D1 audit tables with IP and timestamp; see `docs/en/maintenance.md` for recommended retention windows

## Out of scope

The following are not security bugs in BurnBox itself:

- misconfigured Cloudflare account permissions
- leaked secrets committed outside this repository's templates
- unsafe bucket CORS policies chosen by an operator
- insecure local workstation practices
