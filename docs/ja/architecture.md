# アーキテクチャ

*最終更新: April 11, 2026 at 12:18 PM PDT*

## 概要

BurnBox は Cloudflare ネイティブな薄い制御面です。

- Workers: ルーティング、セッション検証、アップロード調停、共有リンク検証、ダウンロード応答
- R2: ファイル本体の保存
- D1: ファイルメタデータ、アップロード状態、共有状態、監査ログ

BurnBox 2.1.1 には 2 つの主要層があります。

- chunked multipart ingest による upload reliability
- split domains と stable public handle による share delivery separation

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

## Upload flow

1. 管理画面が `POST /api/files/init-upload` を呼ぶ
2. Worker が D1 に upload plan を作成する
3. ブラウザがファイルを 5 MiB チャンクに分割する
4. 各チャンクを Worker の upload channel へ送る
5. Worker が R2 multipart を使って final object を組み立てる
6. 管理画面が `POST /api/files/complete-upload` を呼ぶ
7. Worker が object assembly を確定し、D1 に final file record を書く

この flow は意図的に stateful です。難しさは単に R2 へ byte を送ることではありません。多数の part request、retry、最終 commit 境界をまたいで、正しい system state を保つことにあります。

## Share flow

1. 管理画面がファイルに対して share record を作成する
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
