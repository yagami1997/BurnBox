# Contributing

*Last updated: April 9, 2026 at 12:49 AM PDT*

Thank you for contributing to BurnBox.

## Scope

BurnBox is intentionally narrow. Contributions are most useful when they preserve:

- a small and auditable architecture
- operator control over storage and access policy
- clear privacy boundaries between local configuration and public source code
- Cloudflare-native deployment without unnecessary service sprawl

## Before opening a change

- keep public documentation in English
- keep code comments in English
- do not commit personal domains, account identifiers, bucket names, or secrets
- do not commit local AI assistant workspaces, logs, or private planning material
- keep `wrangler.toml.template` generic and placeholder-only

## Preferred contribution areas

- bug fixes
- security hardening
- documentation improvements
- operational UX improvements that do not expand the system into a general platform
- test coverage and validation improvements

## Pull request notes

- describe the operational impact of the change
- mention any D1 schema change explicitly
- mention any change to R2 upload flow explicitly
- include screenshots only when they do not expose private deployment details

## Design principle

BurnBox should remain understandable to a single careful maintainer. If a change makes the system harder to audit than it makes it useful, it is probably the wrong change.
