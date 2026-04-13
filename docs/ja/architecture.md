# アーキテクチャ

*最終更新: April 12, 2026 at 6:31 PM PDT*

## 概要

BurnBox は Cloudflare ネイティブな薄い制御面です。

- Workers: ルーティング、セッション検証、アップロード調停、共有リンク検証、ダウンロード応答
- R2: ファイル本体の保存
- D1: ファイルメタデータ、アップロード状態、共有状態、監査ログ

BurnBox 2.2.0 には 3 つの主要層があります。

- chunked multipart ingest による upload reliability
- split domains と stable public handle による share delivery separation
- owner claim、upgrade flow、session control による workspace account security

現在の工学的基準線は `4.3 GB / 870 parts` および `11 GB / 2200 parts` までの大容量転送で検証済みです。BurnBox 2.2.0 では owner-claim 認証、legacy upgrade flow、workspace 内 account security がすでに入っています。次の実装段階は resumable upload です。

ここで 1 つ、構造レベルで明示すべき注意があります。

BurnBox における大容量 upload は、単一 request のサイズ問題ではなく、累積信頼性の問題として扱うべきです。

## 中核の構造変更

### 2.0.0: upload reliability

最初の大きな構造変更は、single-request upload をやめて chunked multipart upload にしたことです。これにより、大きな installer や archive でも現実的に扱えるようになりました。

詳しくは:

- [並行チャンク分割アップロード設計](concurrent-chunked-upload.md)

### 2.1.1: share delivery redesign の上に reliability hardening を重ねる段階

次の大きな構造変更は share system の再設計です。目的は:

- 公開リンクに workspace hostname を出さない
- active link を端末横断で再構築できるようにする
- hostname 型共有を baseline ではなく optional extension にする

詳しくは:

- [共有リンク配信アーキテクチャ](share-link-delivery.md)

### 2.2.0: owner claim と account-security への移行

第 3 の大きな転換は、workspace 認証を deployment password 方式から product-level owner account 方式へ移すことです。

- 新規デプロイは owner claim に入る
- 既存デプロイは upgrade flow で移行できる
- password change、recovery、session/device 管理を UI 内に戻す
- 長期ログイン用 password を deployment config に置かない
- recovery email と backup code により、product-level の recovery path を持つ

## Upload flow

1. owner workspace が `POST /api/files/init-upload` を呼ぶ
2. Worker が D1 に upload plan を作成する
3. ブラウザがファイルを 5 MiB チャンクに分割する
4. 各チャンクを Worker の upload channel へ送る
5. Worker が R2 multipart を使って final object を組み立てる
6. 管理画面が `POST /api/files/complete-upload` を呼ぶ
7. Worker が object assembly を確定し、D1 に final file record を書く

この flow は意図的に stateful です。難しさは単に R2 へ byte を送ることではありません。多数の part request、retry、最終 commit 境界をまたいで、正しい system state を保つことにあります。

## Share flow

1. owner workspace がファイルに対して share record を作成する
2. Worker は次を生成する
   - secret token
   - stable `public_handle`
3. 設定済み share domain 上の stable public URL を返す
4. 公開リクエストが share surface に到着する
5. Worker が share state を検証する
   - revoke されていない
   - 期限切れでない
   - download limit を超えていない
6. Worker が短命の signed internal download URL を作る
7. share request を real download path へ redirect する
8. Worker が R2 からファイルを返す

## なぜこの share flow なのか

- hashed token で capability secrecy を保つ
- `public_handle` で active link を再構築できる
- split domain で admin surface の露出を減らす
- internal signed download hop により制御点を残しつつ public landing page を必須にしない
- legacy token link を壊さない

## Auth flow

1. request が workspace host に到達する
2. Worker が auth state を判定する
   - `unclaimed`
   - `upgrade_required`
   - `active`
3. 新規環境は owner claim に進む
4. 旧環境は一度だけ旧 password で upgrade flow に進める
5. active 環境は owner account と session state により認証される
6. password change、recovery-code reset、other-device sign-out は server-controlled session version で旧 session を無効化する

## Auth hardening notes

BurnBox 2.2.0 の auth layer には次の hardening も入っています。

- failed owner login は generic な invalid-credentials reason で記録する
- legacy upgrade login には rate limit がある
- recovery-code reset には rate limit と generic error response がある
- claim token の使用は owner-account 作成と原子的に処理される
- auth/session payload から password hash は外に出ない

## Host 分離モデル

BurnBox は 2 つの public surface を分けます。

- workspace host
  - admin HTML
  - 認証済み `/api/*`
- share host
  - 公開 share URL
  - admin UI を出さない
  - 認証 API を出さない

この分離は Worker route layer で強制されます。

## データモデル

### `files`

- file identity
- storage key
- file size と content type
- tags と note
- timestamps

### `shares`

- file reference
- token hash
- `public_handle`
- expiration
- max downloads
- current download count
- revocation timestamp

### `upload_plans`

- upload identity
- server-controlled storage key
- declared file size
- chunk size
- multipart upload id
- upload status
- timestamps

### `upload_parts`

- upload plan 参照
- part number
- ETag
- part size
- timestamps

### `audit_logs`

- actor
- action
- target type
- target id
- metadata
- timestamp

### `owner_account`

- owner identity
- password hash と algorithm
- recovery email
- session version
- timestamps

### `claim_tokens`

- token hash
- source（log-generated または env-provided）
- used timestamp

### `password_reset_tokens`

- token hash
- expiration
- used timestamp

### `recovery_codes`

- owner reference
- code hash
- used timestamp

### `auth_events`

- event type
- actor
- ip address
- detail json
- timestamp
