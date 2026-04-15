# デプロイ

*最終更新: April 14, 2026 at 6:29 PM PDT*

## 概要

BurnBox 2.3.1 はドメイン分離に加えて、owner account による認証導線を前提にしています。

- 認証済み管理操作を行う private workspace domain
- 外部向け共有リンクを配信する public share domain

例:

- workspace: `https://console.example.com`
- share: `https://relay.example.net`

この分離には明確な理由があります。

- 公開リンクに workspace の hostname を出さない
- 公開面から管理 API を見せない
- 管理面と共有面を別々に進化させやすくする

現在の ownership model:

- 新規デプロイは product 内の one-time owner claim flow で初期設定する
- 既存デプロイはデータを失わずに `ADMIN_PASSWORD` から owner account へ upgrade できる
- password rotation、backup code、optional な recovery email support、session reset はすべて workspace 内で管理する
- deployment-managed な private workspace entry prefix を `/ops` のように任意設定できる

## 開始前に決めること

設定を始める前に、次の 2 点を決めてください。

**1. private workspace entry prefix（`APP_ENTRY_PATH`）**

private workspace を `/` から配信するか、`/ops` のような prefix 配下に置くかを決めます。この設定は workspace の HTML ルートと、認証済み `/api/*` ルートの両方に影響します。初回デプロイ後に変更しても migration は不要ですが、運用者のアクセス URL が変わります。

セキュリティ上の懸念がある deployment では、意味を持たない prefix を設定することで、自動スキャナーが管理面を見つけにくくなります。

**2. recovery path の方針**

BurnBox は backup code を既定の recovery path として持ちます。recovery email は optional であり、意図的な設定が必要です。事前に決めてください。

- backup code のみ: シンプル、mail インフラ不要。claim 時に表示されるコードを必ず保存する
- backup code + recovery email: 2 つ目の recovery path が加わる。operator が受け取れる email address が必要

どちらの選択も有効です。重要な点は、**backup code は claim 時に一度だけ表示されます。ブラウザを閉じる前に必ず保存してください。**

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
APP_ENTRY_PATH = "/ops"
```

hostname 型共有をまだ使わない場合は `SHARE_SUBDOMAIN_BASE_DOMAIN` を省略してください。
private workspace を prefix 配下に置かない場合は `APP_ENTRY_PATH` を省略すると、workspace は `/` から提供されます。

## Secrets

本番では次を設定します。

- `SESSION_SECRET` — owner session signing 用
- `SHARE_LINK_SECRET` — 公開 download signature 用
- `CLAIM_KEY` — 初回 owner claim の one-time setup key。log-generated claim code を使わない場合のみ

`SESSION_SECRET` と `SHARE_LINK_SECRET` は別の値にしてください。同じ値にすると、管理 session 署名と公開 download 署名が同じ secret material を共有することになり、2 つの面の分離が失われます。

`SHARE_LINK_SECRET` は省略できません。未設定だと、管理 login が動いていても公開 share download は `503` で失敗します。

`CLAIM_KEY` は one-time setup key であり、claim 成功後に再利用できません。省略すると、初回 workspace アクセス時に claim token が生成され Worker log に書き出されます。

legacy upgrade の注意:

- 既存 workspace が `Upgrade your BurnBox security` を完了するまでは `ADMIN_PASSWORD` を消さない
- upgrade 完了後に owner login が確認できたら、旧 password secret を削除してよい

## Database migration

本番デプロイ前に schema を適用します。

既定名を使っていない場合、以下の `burnbox` は自分の D1 database 名に置き換えてください。

```bash
npx wrangler d1 execute burnbox --remote --file=./migrations/0001_initial.sql
npx wrangler d1 execute burnbox --remote --file=./migrations/0002_upload_plans.sql
npx wrangler d1 execute burnbox --remote --file=./migrations/0003_multipart_uploads.sql
npx wrangler d1 execute burnbox --remote --file=./migrations/0004_share_public_handle.sql
npx wrangler d1 execute burnbox --remote --file=./migrations/0005_owner_auth.sql
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

1. workspace domain を開く
2. 新規デプロイなら `Claim your BurnBox` を完了する
3. 旧環境なら `Upgrade your BurnBox security` を完了する
4. owner login が成功する
5. この deployment で `Recovery email` を本当に使うか決める。これは operator-managed な optional setting であり、自用 deployment では backup code のみを recovery path にする判断もありうる
6. `Change password`、`Generate Backup Codes`、`Sign Out Other Devices` が動作する
7. email recovery を使う方針なら、workspace account card から recovery email を追加できる
8. `APP_ENTRY_PATH` を使う場合、その prefixed route から private workspace が開き、`/` から直接は出ない
9. ファイルをアップロードできる
10. multipart upload が finalization まで進む
11. file list に表示される
12. share を作成できる
13. stable link が public share domain を使う
14. stable link が `/h/{publicHandle}` になる
15. 開くと直接 download が始まる
16. `503` の場合は、デプロイ済み Worker に `SHARE_LINK_SECRET` が入っているか確認する
17. 別端末から見ても active share に `Copy link` が出る
18. public share domain から `/api/*` や workspace root が見えない

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
