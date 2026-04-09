# アーキテクチャ

*最終更新: April 9, 2026 at 12:49 AM PDT*

## 概要

BurnBox は Cloudflare ネイティブな薄い構成です。

- Workers: ルーティング、セッション検証、アップロード計画、共有リンク検証、ダウンロード応答
- R2: ファイル本体の保存
- D1: ファイルメタデータ、共有メタデータ、監査ログ

## アップロードフロー

1. 管理画面が `POST /api/files/init-upload` を呼ぶ
2. Worker が署名付き R2 アップロード URL を作る
3. ブラウザがファイルを R2 に直接アップロードする
4. 管理画面が `POST /api/files/complete-upload` を呼ぶ
5. Worker がオブジェクト存在確認後、D1 にメタデータを書き込む

## 共有フロー

1. 管理画面がファイルに対して共有レコードを作成する
2. Worker がランダムトークンを生成し、ハッシュのみを保存する
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
- 各種 timestamp

### `shares`

- ファイル参照
- token hash
- expiration
- max downloads
- current download count
- revoke timestamp

### `audit_logs`

- actor
- action
- target type
- target id
- metadata
- timestamp
