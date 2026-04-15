# アーキテクチャ

*最終更新: April 14, 2026 at 6:29 PM PDT*

## 概要

BurnBox は Cloudflare ネイティブな薄い制御面です。

- Workers: ルーティング、セッション検証、アップロード調停、共有リンク検証、ダウンロード応答
- R2: ファイル本体の保存
- D1: ファイルメタデータ、アップロード状態、共有状態、監査ログ

BurnBox 2.3.0 には 6 つの主要層があります。

- chunked multipart ingest による upload reliability
- split domains と stable public handle による share delivery separation
- owner claim、upgrade flow、session control による workspace account security
- private workspace route isolation と operator-visible upload diagnostics
- frontend モジュール分離 — workspace インラインスクリプトが `src/lib/client/` 以下の責務別モジュールに分離済み
- resumable upload — サーバーが確認済み part truth を持ち、中断後にクライアントが不足 part だけを再送する

現在の工学的基準線は `4.3 GB / 870 parts` および `11 GB / 2200 parts` までの大容量転送で検証済みです。BurnBox 2.3.0 では 2.2.2 の frontend モジュール基準の上に resumable upload 層が完成しています。

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
- backup code により product-level の recovery baseline を持ち、recovery email は operator policy に応じた optional 機能として扱う

### 2.3.0: resumable upload

第 6 の大きな転換は、サーバーを確認済み part truth の権威として明確に位置づけ、中断後の recovery path を整えることです。

- `GET /api/files/upload-status` が durable な `upload_parts` state から確認済み part 一覧、plan status、total parts、next-part pointer を返す
- クライアントは part loop 開始前にこの endpoint を問い合わせ、確認済み part をスキップする。進捗表示は実際の再開位置に整合される
- `init-upload` 後に `localStorage` が upload plan 識別子を記録する。page refresh 後、ファイル名・サイズが一致するファイルを選ぶと追加操作なしで自動 resume が起動する
- resume バナーを dismiss すると `abort-upload` が呼ばれ、R2 の incomplete multipart と D1 の upload plan が即座に削除される

設計の立場: ブラウザは実行端末であり、state の権威ではない。中断した upload は失敗した request ではなく、部分コミット状態にあるシステムです。recovery はサーバーが何を知っているかを問い合わせることから始まります。

### 2.2.2: frontend モジュール分離

第 5 の大きな転換は、workspace UI 層の構造的 maintainability pass です。

- `layout.js` にベタ書きされていた monolithic インラインスクリプトを、`helpers`、`share`、`files`、`upload`、`boot-wiring` の 5 つのクライアントモジュールに分離
- `layout.js` はこれらを import して page script を組み合わせるだけになった
- `boot.apiBase` と `boot.appEntryPath` が private API path の唯一の源として維持されており、裸の `/api/...` 文字列は再導入されていない
- product behavior の変更はなく、2.3.0 の resumable upload の前置き整理として位置づけられる

### 2.2.1: private-entry routing と upload observability

第 4 の大きな転換は、既存の private workspace に対する運用 hardening です。

- deployment-managed route prefix で private workspace を `/ops` のような path 配下に置ける
- private HTML route と authenticated `/api/*` route が同じ server-controlled prefix から派生する
- workspace では routing を UI から編集させず、read-only の `Private entry` として表示する
- unfinished / failed upload について、server-side multipart progress を operator が確認できる
- failed upload には明示的な abort path があり、multipart completion 後に metadata commit が失敗した場合は compensating object deletion が走る

## Upload flow

1. owner workspace が `POST /api/files/init-upload` を呼ぶ
2. Worker が D1 に upload plan を作成し、`fileId` と chunk geometry を返す
3. クライアントが `GET /api/files/upload-status` を呼んで D1 から確認済み part を取得する
4. ブラウザがファイルを 5 MiB チャンクに分割し、確認済み part はスキップする
5. 各チャンクを Worker の upload channel へ送る。Worker は R2 write 成功後に `upload_parts` へ確認済み part を記録する
6. 管理画面が `POST /api/files/complete-upload` を呼ぶ
7. Worker が全 part の揃い・連続性を確認し、R2 multipart object を確定、D1 に final file record を書く

page refresh や再入場時は、クライアントが `localStorage` の pending record を検知し、同一ファイルが選択されると step 3 から resume が始まります。新たな `init-upload` は発行されません。

この flow は意図的に stateful です。難しさは単に R2 へ byte を送ることではありません。多数の part request、retry、中断、最終 commit 境界をまたいで、正しい system state を保つことにあります。

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

BurnBox 2.2.0 と 2.2.1 を通じて、auth と routing layer には次の hardening も入っています。

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
- optional recovery email
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
