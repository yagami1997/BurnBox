# Contributing

*Last updated: April 11, 2026 at 12:18 PM PDT*

Thank you for contributing to BurnBox.

The active development target is BurnBox `2.1.1`.

## Scope

BurnBox is intentionally narrow. Contributions are most useful when they preserve:

- a small and auditable architecture
- operator control over storage and access policy
- clear privacy boundaries between local configuration and public source code
- Cloudflare-native deployment without unnecessary service sprawl

## Public repository rules

- do not commit personal domains, account identifiers, bucket names, route patterns, or secrets
- do not commit screenshots or logs that expose private infrastructure
- do not commit local AI assistant workspaces, notes, or private planning material
- keep `wrangler.toml.template` generic and placeholder-only
- keep all public Git-tracked docs on placeholder domains such as `console.example.com` and `relay.example.net`
- keep all public Git-tracked docs stamped with a `PDT` last-updated line

## Development guide

BurnBox `2.1.1` is the current release line. The architecture direction is:

- a private workspace domain for authenticated operations
- a public share domain for external delivery
- stable public links based on `public_handle`
- default share URLs using `/h/{publicHandle}`
- legacy `/s/{token}` compatibility
- optional hostname-style sharing when operators explicitly provision wildcard certificates

This route exists for technical reasons, not just UI preference:

- hashed tokens are good for capability secrecy, but they are not reconstructable across devices because the plaintext token is never stored
- `public_handle` gives the system a stable public identifier that can be rebuilt from D1 rows
- path-based `public_handle` links avoid wildcard certificate requirements while still separating the public share domain from the private workspace domain
- hostname-style sharing is treated as an opt-in extension, not the default baseline

## Documentation obligations

When you change share behavior, deployment behavior, or release direction, update the public docs in the same change set.

At minimum, review:

- `README.md`
- `CONTRIBUTING.md`
- `docs/README.md`
- `docs/en/quickstart.md`
- `docs/en/deployment.md`
- `docs/en/architecture.md`
- `docs/en/share-link-delivery.md`
- `docs/en/troubleshooting.md`
- `docs/ja/quickstart.md`
- `docs/ja/deployment.md`
- `docs/ja/architecture.md`
- `docs/ja/share-link-delivery.md`
- `docs/ja/troubleshooting.md`

## What technical docs should explain

Public technical documentation should explain:

- the problem being solved
- the chosen architecture
- why alternative routes were not made default
- migration and compatibility strategy
- operational risks and certificate constraints
- how later contributors can extend the system without breaking privacy or link stability

If a pull request changes route behavior, share URL shape, migration sequencing, active share reconstruction, or certificate assumptions, the relevant technical docs should be updated before merge.

## Preferred contribution areas

- bug fixes
- security hardening
- documentation improvements
- operational UX improvements that do not expand the system into a general platform
- test coverage and validation improvements

## Pull request notes

- describe the operational impact of the change
- mention any D1 schema change explicitly
- mention any R2 upload-flow change explicitly
- mention any share URL or route behavior change explicitly
- include screenshots only when they do not expose private deployment details

## Design principle

BurnBox should remain understandable to a single careful maintainer. If a change makes the system harder to audit than it makes it useful, it is probably the wrong change.
