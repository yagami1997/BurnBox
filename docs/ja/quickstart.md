# クイックスタート

*最終更新: April 9, 2026 at 5:42 AM PDT*

## 必要なもの

- Node.js 18 以上
- Cloudflare アカウント
- R2 バケット 1 つ
- D1 データベース 1 つ

## 1. 依存関係をインストール

```bash
npm install
```

## 2. 設定を準備

`wrangler.toml.template` を `wrangler.toml` にコピーし、プレースホルダーを自分の値に置き換えてください。

## 3. データベーススキーマを適用

```bash
npx wrangler d1 execute burnbox --remote --file=./migrations/0001_initial.sql
npx wrangler d1 execute burnbox --remote --file=./migrations/0002_upload_plans.sql
npx wrangler d1 execute burnbox --remote --file=./migrations/0003_multipart_uploads.sql
```

ローカル D1 エミュレーションも使う場合は、次も実行できます。

```bash
npx wrangler d1 execute burnbox --local --file=./migrations/0001_initial.sql
npx wrangler d1 execute burnbox --local --file=./migrations/0002_upload_plans.sql
npx wrangler d1 execute burnbox --local --file=./migrations/0003_multipart_uploads.sql
```

## 4. 本番 secrets を設定

```bash
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put SESSION_SECRET
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
```

## 5. ローカル開発用 secrets を設定

プロジェクトルートに `.dev.vars` を作成します。

```env
ADMIN_PASSWORD=your-local-admin-password
SESSION_SECRET=your-long-random-session-secret
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
```

`wrangler dev --remote` でもローカル側で Worker secrets を読む必要があるため、このファイルが必要です。

## 6. 開発サーバーを起動

```bash
npm run dev
```

## 7. 動作確認

- 管理画面にログインする
- テスト用ファイルをアップロードする
- チャンク進捗と finalization を確認する
- ファイル一覧に表示されることを確認する
- 共有リンクを作成する
- そのリンクからダウンロードする
- リンクを revoke して無効化を確認する

設計背景は [並行チャンク分割アップロード設計](concurrent-chunked-upload.md) を参照してください。
