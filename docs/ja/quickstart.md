# クイックスタート

*最終更新: April 9, 2026 at 12:49 AM PDT*

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
```

ローカル D1 エミュレーションも使う場合は、次も実行できます。

```bash
npx wrangler d1 execute burnbox --local --file=./migrations/0001_initial.sql
npx wrangler d1 execute burnbox --local --file=./migrations/0002_upload_plans.sql
```

## 4. Secrets を設定

```bash
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put SESSION_SECRET
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
```

## 5. 開発サーバーを起動

```bash
npm run dev
```

## 6. 動作確認

- 管理画面にログインする
- テスト用ファイルをアップロードする
- ファイル一覧に表示されることを確認する
- 共有リンクを作成する
- そのリンクからダウンロードする
- リンクを revoke して無効化を確認する
