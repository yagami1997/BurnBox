# アーキテクチャ

*最終更新: April 9, 2026 at 5:42 AM PDT*

## 概要

BurnBox は Cloudflare ネイティブな薄い制御面です。

- Workers: ルーティング、セッション検証、アップロード調停、共有リンク検証、ダウンロード応答
- R2: ファイル本体の保存
- D1: ファイルメタデータ、アップロード状態、共有状態、監査ログ

## 中核の構造変更

BurnBox 2.0.0 で最も重要な技術判断は、単発の single upload をやめ、チャンク分割 + multipart アップロード構成へ移行したことです。

BurnBox はインストーラ、バイナリ、アーカイブのような実ファイルを扱うため、アップロード安定性は極めて重要です。そのため、最小の見た目の単純さよりも、状態が見えることと復旧しやすさを優先しました。

詳しい理由は [並行チャンク分割アップロード設計](concurrent-chunked-upload.md) を参照してください。

## アップロードフロー

1. 管理画面が `POST /api/files/init-upload` を呼ぶ
2. Worker が D1 に upload plan を作成する
3. ブラウザがファイルを 5 MiB チャンクに分割する
4. 各チャンクを Worker のアップロードチャネルへ送る
5. Worker が R2 multipart を使って最終オブジェクトを組み立てる
6. 管理画面が `POST /api/files/complete-upload` を呼ぶ
7. Worker が最終組み立てを確定し、D1 に正式な file record を書き込む

## この構造を採用した理由

- チャンク化により一回の失敗コストを小さくできる
- multipart により単一巨大リクエスト依存を避けられる
- upload planning により storage key をサーバーが支配できる
- finalization により転送完了と ready 状態を分離できる
- UI が本当の状態を示せる

## 共有フロー

1. 管理画面がファイルに対して共有レコードを作成する
2. Worker がランダムトークンを生成し、SHA-256 ハッシュのみを保存する
3. ユーザーが `/s/:token` を開く
4. Worker が共有状態を検証する
   - revoke されていない
   - 期限切れでない
   - ダウンロード上限を超えていない
5. Worker が R2 からファイルを返す

## データモデル

### `files`

- ファイル識別子
- storage key
- サイズと content type
- tags と note
- timestamp

### `shares`

- ファイル参照
- token hash
- expiration
- max downloads
- current download count
- revoke timestamp

### `upload_plans`

- upload 識別子
- サーバー管理の storage key
- declared size
- chunk size
- multipart upload id
- upload status
- timestamp

### `upload_parts`

- upload plan 参照
- part number
- ETag
- part size
- timestamp

### `audit_logs`

- actor
- action
- target type
- target id
- metadata
- timestamp
