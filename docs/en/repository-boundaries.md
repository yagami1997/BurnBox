# Repository Boundaries

*Last updated: April 9, 2026 at 5:42 AM PDT*

## Public repository

The public GitHub repository should contain only reusable project material:

- source code
- migrations
- generic configuration templates
- English project metadata
- English and Japanese end-user or operator documentation

All tracked code comments should be written in English.

## Local-only material

Keep the following outside version control:

- personal deployment notes
- private planning documents
- local screenshots
- local scratch files
- production secrets
- personal domains, account identifiers, and bucket names
- AI assistant workspaces, logs, and session state

This repository ignores local-only directories such as `local/`, `private/`, `.cursor/`, `.claude/`, `.codex/`, `.windsurf/`, and similar tool-generated workspaces.

## Documentation layout

Use the following structure:

- `README.md`: English-only repository entrypoint
- `docs/en/`: English documentation
- `docs/ja/`: Japanese documentation
- `local/`: optional local-only notes in any language, ignored by Git

## Configuration policy

- Commit `wrangler.toml.template` only with placeholders.
- Keep the real `wrangler.toml` local.
- Use Wrangler secrets for sensitive values.
- Never commit account-specific routes, production origins, access keys, or session secrets.
