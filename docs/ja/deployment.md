# デプロイ手順

*最終更新: April 9, 2026 at 12:49 AM PDT*

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

## スキーマ適用

初回デプロイ前にスキーマを適用します。

```bash
npx wrangler d1 execute burnbox --remote --file=./migrations/0001_initial.sql
```

## デプロイ

```bash
npm run deploy
```

## デプロイ後の確認

- ログインできる
- ファイルをアップロードできる
- ファイル一覧が表示される
- 一時共有リンクを作成できる
- 共有リンクからダウンロードできる
- revoke 後にリンクが無効になる

## R2 CORS

ブラウザから R2 に直接アップロードするため、バケットの CORS では次を許可する必要があります。

- method: `PUT`
- 管理画面の origin
- header: `Content-Type`
