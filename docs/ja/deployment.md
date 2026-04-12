# デプロイ

*最終更新: April 12, 2026 at 4:26 AM PDT*

## 概要

BurnBox 2.1.1 はドメイン分離を前提にしています。

- 認証済み管理操作を行う private workspace domain
- 外部向け共有リンクを配信する public share domain

例:

- workspace: `https://console.example.com`
- share: `https://relay.example.net`

この分離には明確な理由があります。

- 公開リンクに workspace の hostname を出さない
- 公開面から管理 API を見せない
- 管理面と共有面を別々に進化させやすくする

## 必要な Cloudflare リソース

- Worker 1つ
- R2 bucket 1つ
- D1 database 1つ
- workspace 用 hostname 1つ
- public share 用 hostname 1つ

任意:

- hostname 型共有を使う場合の wildcard share-host route

## 推奨ドメインモデル

推奨ベースライン:

- workspace: `console.example.com`
- share domain: `relay.example.net`
- 既定の安定リンク: `https://relay.example.net/h/{publicHandle}`

任意拡張:

- hostname 型共有: `https://{publicHandle}.relay.example.net`

証明書戦略を明示的に持たない限り、hostname 型共有を既定にはしないでください。

## なぜ `/h/{publicHandle}` を既定にしたか

以前の共有リンクは `/s/{token}` でした。互換性のため今も利用できますが、長期的な安定リンクとしては最適ではありません。

理由:

- D1 には token の平文を保存しない
- 保存しているのは hash のみ
- そのため server は後から旧 token URL を再構築できない
- 複数端末で同じ active share を扱うには再構築可能な公開識別子が必要

`public_handle` はそのために導入されました。

## DNS と route 設定

### path 型 public share domain

次を設定します。

- `relay.example.net` 用の proxied DNS record
- `relay.example.net/*` の Worker route
- `console.example.com/*` の Worker route

### hostname 型共有を使う場合

`https://abc123.relay.example.net` のような形を使う場合はさらに:

- `*.relay.example.net` の proxied wildcard DNS record
- `*.relay.example.net/*` の Worker route
- `SHARE_SUBDOMAIN_BASE_DOMAIN=relay.example.net`

### 重要な証明書メモ

Wildcard DNS だけでは足りません。証明書カバレッジも必要です。

典型例:

- `https://relay.example.net` は開く
- `https://abc123.relay.example.net` は SSL エラーになる

そのため BurnBox は hostname 型共有を既定にせず、path 型 stable link を既定にしています。

## `wrangler.toml` 設定例

```toml
name = "burnbox"
main = "src/worker.js"
compatibility_date = "2026-04-09"

routes = [
  { pattern = "console.example.com/*", zone_name = "example.com" },
  { pattern = "relay.example.net/*", zone_name = "example.net" },
  { pattern = "*.relay.example.net/*", zone_name = "example.net" }
]

d1_databases = [
  { binding = "DB", database_name = "burnbox", database_id = "YOUR_DATABASE_ID" }
]

[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "YOUR_BUCKET_NAME"

[vars]
APP_BASE_URL = "https://console.example.com"
SHARE_BASE_URL = "https://relay.example.net"
SHARE_SUBDOMAIN_BASE_DOMAIN = "relay.example.net"
ALLOWED_APP_HOSTS = "console.example.com"
ALLOWED_SHARE_HOSTS = "relay.example.net"
```

hostname 型共有をまだ使わない場合は `SHARE_SUBDOMAIN_BASE_DOMAIN` を省略してください。

## Secrets

本番では次を設定します。

- `ADMIN_PASSWORD`
- `SESSION_SECRET`
- `SHARE_LINK_SECRET`

推奨:

- 管理 session には `SESSION_SECRET`
- 公開 download signature には `SHARE_LINK_SECRET`

`SHARE_LINK_SECRET` は省略できません。未設定だと、管理 login が動いていても公開 share download は `503` で失敗します。

## Database migration

本番デプロイ前に schema を適用します。

既定名を使っていない場合、以下の `burnbox` は自分の D1 database 名に置き換えてください。

```bash
npx wrangler d1 execute burnbox --remote --file=./migrations/0001_initial.sql
npx wrangler d1 execute burnbox --remote --file=./migrations/0002_upload_plans.sql
npx wrangler d1 execute burnbox --remote --file=./migrations/0003_multipart_uploads.sql
npx wrangler d1 execute burnbox --remote --file=./migrations/0004_share_public_handle.sql
```

注意:

- `0004_share_public_handle.sql` は additive migration として適用する
- 古い migration を書き換えて最初から存在したことにしない
- duplicate column や duplicate index が出たら live schema を確認する

## デプロイ

```bash
npm run deploy
```

## デプロイ後の確認

次の順で確認してください。

1. workspace domain にログインできる
2. ファイルをアップロードできる
3. multipart upload が finalization まで進む
4. file list に表示される
5. share を作成できる
6. stable link が public share domain を使う
7. stable link が `/h/{publicHandle}` になる
8. 開くと直接 download が始まる
9. `503` の場合は、デプロイ済み Worker に `SHARE_LINK_SECRET` が入っているか確認する
10. 別端末から見ても active share に `Copy link` が出る
11. public share domain から `/api/*` や workspace root が見えない

## privacy-oriented DNS 命名について

公開リンクの意味漏れを減らしたい場合は、共有用 hostname を workspace と分けてください。

原則:

- workspace hostname は運用者に分かりやすくする
- public share hostname は別に切り出す
- share hostname に業務用語を入れない方が良い場合もある
- share ごとに DNS record を増やさない
- 変化するのは `public_handle` であり DNS ではない

これにより、リンクの公開面を分離しつつ DNS 運用を単純に保てます。

## 関連文書

- [クイックスタート](quickstart.md)
- [アーキテクチャ](architecture.md)
- [共有リンク配信アーキテクチャ](share-link-delivery.md)
- [トラブルシューティング](troubleshooting.md)
