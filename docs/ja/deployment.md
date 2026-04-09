# デプロイ手順

*最終更新: April 9, 2026 at 5:42 AM PDT*

## Cloudflare リソース

BurnBox には以下が必要です。

- Worker 1 つ
- R2 バケット 1 つ
- D1 データベース 1 つ

## 設定

`wrangler.toml` には以下を設定します。

- Worker 名
- ルートパターン
- zone 名または zone id
- D1 バインディング
- R2 バインディング
- アカウント変数

個人用の本番値はコミットしないでください。

## Secrets

本番用に以下の secrets を設定します。

- `ADMIN_PASSWORD`
- `SESSION_SECRET`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

## ログイン保護

本番では `POST /api/auth/login` に対して Cloudflare WAF または rate-limit rule を設定してください。BurnBox はアプリケーション内部に lockout 状態を保持しません。

## スキーマ適用

初回デプロイ前にスキーマを適用します。

```bash
npx wrangler d1 execute burnbox --remote --file=./migrations/0001_initial.sql
npx wrangler d1 execute burnbox --remote --file=./migrations/0002_upload_plans.sql
npx wrangler d1 execute burnbox --remote --file=./migrations/0003_multipart_uploads.sql
```

既存 DB に対して `0003_multipart_uploads.sql` を再実行して duplicate column エラーが出る場合、multipart 用スキーマはすでに適用済みの可能性があります。まず現在のテーブル構造を確認してください。

## デプロイ

```bash
npm run deploy
```

## デプロイ後の確認

- ログインできる
- ファイルを連続してアップロードできる
- チャンク進捗と finalization が見える
- ファイル一覧が表示される
- 一時共有リンクを作成できる
- 共有リンクからダウンロードできる
- revoke 後にリンクが無効になる

## R2 補足

BurnBox は現在、Worker 経由のチャンク転送と R2 multipart 組み立てを採用しています。背景は [並行チャンク分割アップロード設計](concurrent-chunked-upload.md) を参照してください。
