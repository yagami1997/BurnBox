# Contributing

*Last updated: April 13, 2026 at 6:06 AM PDT*

Thank you for contributing to BurnBox.

The current shipped baseline is BurnBox `2.2.1`.

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
- keep all public Git-tracked docs stamped with a real-time `PDT` or `PST` last-updated line

## Compliance expectation

BurnBox is not intended for casual or irresponsible deployment. Anyone who forks, deploys, operates, extends, or redistributes this project is expected to maintain a high standard of legal and compliance awareness.

That expectation includes:

- understanding and following the network-security, copyright, file-sharing, privacy, and platform-operation rules that apply in the jurisdiction where the code is developed, deployed, or made available
- evaluating whether a planned deployment remains lawful in the operator's country, region, industry, and hosting context
- refusing uses that depend on infringement, unauthorized access, complaint evasion, or regulatory evasion
- treating compliance work as part of operating the system, not as an optional afterthought

If a prospective fork operator is unwilling to meet that standard, BurnBox is not an appropriate project for that deployment.

## Development guide

BurnBox `2.2.1` is the current release line. The architecture direction is:

- an owner-account auth layer inside the product
- a private workspace domain for authenticated operations
- an optional deployment-managed private workspace entry prefix
- a public share domain for external delivery
- stable public links based on `public_handle`
- default share URLs using `/h/{publicHandle}`
- legacy `/s/{token}` compatibility
- optional hostname-style sharing when operators explicitly provision wildcard certificates

The current engineering priorities are:

- keep the owner-account security baseline clean and auditable
- preserve the private-entry and upload-diagnostics baseline
- improve workspace maintainability before adding larger upload-resume logic
- preserve Cloudflare-native deployment without introducing unnecessary backend sprawl

This route exists for technical reasons, not just UI preference:

- hashed tokens are good for capability secrecy, but they are not reconstructable across devices because the plaintext token is never stored
- `public_handle` gives the system a stable public identifier that can be rebuilt from D1 rows
- path-based `public_handle` links avoid wildcard certificate requirements while still separating the public share domain from the private workspace domain
- hostname-style sharing is treated as an opt-in extension, not the default baseline

## Documentation obligations

When you change share behavior, deployment behavior, or release direction, update the public docs in the same change set.

Before proposing or operating a public-facing deployment, read the project's legal risk guidance and make sure the contribution does not weaken that compliance posture.

At minimum, review:

- `README.md`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `docs/README.md`
- `docs/en/legal-risk-statement.md`
- `docs/en/quickstart.md`
- `docs/en/deployment.md`
- `docs/en/architecture.md`
- `docs/en/development-plan.md`
- `docs/en/share-link-delivery.md`
- `docs/en/troubleshooting.md`
- `docs/ja/quickstart.md`
- `docs/ja/deployment.md`
- `docs/ja/architecture.md`
- `docs/ja/development-plan.md`
- `docs/ja/legal-risk-statement.md`
- `docs/ja/share-link-delivery.md`
- `docs/ja/troubleshooting.md`

## What technical docs should explain

Public technical documentation should explain:

- the problem being solved
- the chosen architecture
- why alternative routes were not made default
- migration and compatibility strategy
- release-line context and current engineering priority
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
- mention any owner-auth or session-behavior change explicitly
- mention any share URL or route behavior change explicitly
- mention any public documentation or timestamp update explicitly
- confirm that the proposed change is intended for lawful, compliant use and does not weaken the project's legal or compliance posture
- include screenshots only when they do not expose private deployment details

## Design principle

BurnBox should remain understandable to a single careful maintainer. If a change makes the system harder to audit than it makes it useful, it is probably the wrong change.
