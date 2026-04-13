# Documentation

*Last updated: April 12, 2026 at 5:16 PM PDT*

This directory contains the public operator and engineering documentation for BurnBox.

All public examples use placeholder domains only. Do not replace them with personal production values in tracked documentation.

The most important engineering theme across these documents is that BurnBox treats large-file upload as a cumulative reliability problem across browser, Worker, R2, and D1 boundaries rather than as a simple request-size problem.

## Start Here

For a new fork or the first production deployment, read in this order:

1. Quickstart
2. Deployment
3. Troubleshooting
4. AI Deployment Handoff, if you want an assistant to execute the process with you

That path covers:

- `wrangler.toml` preparation
- D1 migration order
- required secrets including `SESSION_SECRET`, `SHARE_LINK_SECRET`, and one-time claim setup
- first-run owner claim or legacy-upgrade flow
- post-deploy validation for owner sign-in, recovery controls, upload, and public share links

## English

- [Quickstart](en/quickstart.md)
- [AI Deployment Handoff](en/ai-deployment-handoff.md)
- [Deployment](en/deployment.md)
- [Architecture](en/architecture.md)
- [Development Plan](en/development-plan.md)
- [Release Checklist](en/release-checklist.md)
- [Share Link Delivery Architecture](en/share-link-delivery.md)
- [Concurrent Chunked Upload Design](en/concurrent-chunked-upload.md)
- [Troubleshooting](en/troubleshooting.md)
- [Repository Boundaries](en/repository-boundaries.md)

## Japanese

- [AI デプロイ引き継ぎ](ja/ai-deployment-handoff.md)
- [クイックスタート](ja/quickstart.md)
- [デプロイ手順](ja/deployment.md)
- [アーキテクチャ](ja/architecture.md)
- [開発計画](ja/development-plan.md)
- [リリース前チェックリスト](ja/release-checklist.md)
- [共有リンク配信アーキテクチャ](ja/share-link-delivery.md)
- [並行チャンク分割アップロード設計](ja/concurrent-chunked-upload.md)
- [トラブルシューティング](ja/troubleshooting.md)
- [リポジトリ境界](ja/repository-boundaries.md)
