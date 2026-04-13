# AI デプロイ引き継ぎ

*最終更新: April 12, 2026 at 6:31 PM PDT*

## 目的

この文書は、Claude、GPT、Codex などのコーディング支援 AI に、新しい BurnBox fork をローカル checkout から実運用可能な Cloudflare デプロイまで支援させたい利用者向けです。

AI に「この repo を見て適当にデプロイして」と任せるのではなく、この文書を handoff として渡してください。Cloudflare リソース名、必須 secrets、schema migration 順序、share link 検証に関する曖昧さを減らすための文書です。

## AI が実行すべきこと

AI は次の順で支援または実行するべきです。

1. リポジトリを確認し、デプロイ関連ファイルの存在を確認する
2. `wrangler.toml.template` から `wrangler.toml` を準備する
3. Worker 名、D1 database 名、D1 database id、R2 bucket 名、workspace hostname、public share hostname を確認する
4. D1 migration を順番どおりに適用する
5. 必須 Worker secrets を設定する
   - `SESSION_SECRET`
   - `SHARE_LINK_SECRET`
   - manual claim code を使う場合だけ `CLAIM_KEY`
6. Worker を deploy する
7. owner claim または upgrade flow、upload、share 作成、share download を検証する
8. workspace account controls、つまり recovery email、password change、backup-code generation、logout、`Sign Out Other Devices` を検証する
9. public link が失敗した場合は、まず `SHARE_LINK_SECRET`、`SHARE_BASE_URL`、`ALLOWED_SHARE_HOSTS`、route 設定を確認する

## 重要な制約

- Cloudflare リソース名を AI に推測させない
- D1 database 名が `burnbox` だと決めつけない。実際の設定値を読むこと
- `SHARE_LINK_SECRET` を省略しない。未設定だと公開 share download は `503` で失敗する
- wildcard DNS、Worker route、certificate coverage を意図的に整備していない限り、hostname 型 share link を有効化しない
- 既定では path 型 stable public link `/h/{publicHandle}` を使う

## 推奨する事前準備

AI に渡す前に、次の値を用意しておくとスムーズです。

- Cloudflare account access
- Worker name
- D1 database name
- D1 database id
- R2 bucket name
- workspace hostname
- public share hostname
- owner email
- 強い session secret
- 強い share-link secret
- log-generated claim code を使わない場合だけ manual claim key
- fresh deployment か、legacy `ADMIN_PASSWORD` からの upgrade か

## AI へのコピペ用プロンプト

Claude、GPT、Codex などには次の prompt を使ってください。

```text
You are helping me deploy a fresh BurnBox fork.

Read these files first and follow them strictly:
- README.md
- docs/README.md
- docs/en/quickstart.md
- docs/en/deployment.md
- docs/en/troubleshooting.md
- docs/en/ai-deployment-handoff.md

Your job is to guide and execute the deployment step by step without guessing configuration.

Rules:
- Inspect the repository before acting.
- Use the actual values I provide for Worker name, D1 database name/id, R2 bucket, workspace host, and share host.
- Do not assume the D1 database name is "burnbox" unless the config actually uses that name.
- Do not skip SHARE_LINK_SECRET.
- Warn me before any force push, destructive action, or secret overwrite.
- After deployment, verify:
  1. owner claim or upgrade works
  2. recovery email and password change work
  3. file upload works
  4. share creation works
  5. the stable link uses the public share host
  6. the share link downloads directly

If anything fails, debug in this order:
- wrangler.toml values
- D1 migration state
- Worker secrets
- Cloudflare routes
- share-domain configuration

Keep a short running checklist of what is done and what is still blocked.
```

## 最小成功チェックリスト

次のすべてが満たされるまでは、デプロイ完了と見なさないでください。

- `wrangler.toml` が intended Cloudflare resources と一致している
- 5 本の D1 migrations が順番どおりに適用されている
- Worker に `SESSION_SECRET` と `SHARE_LINK_SECRET` が存在する
- manual claim code を使うなら `CLAIM_KEY` も存在する
- Worker が workspace host と public share host の両方に deploy されている
- owner claim または upgrade が成功する
- workspace account controls も成功する
- 少なくとも 1 回 upload が完了する
- 少なくとも 1 本の share link が正常に download できる

## 関連文書

- [クイックスタート](quickstart.md)
- [デプロイ手順](deployment.md)
- [トラブルシューティング](troubleshooting.md)
