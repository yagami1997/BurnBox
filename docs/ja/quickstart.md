# クイックスタート

*最終更新: April 11, 2026 at 12:18 PM PDT*

## 要件

- Node.js 18+
- Cloudflare account
- R2 bucket 1つ
- D1 database 1つ
- workspace 用 hostname 1つ
- public share 用 hostname 1つ

## 1. 依存関係のインストール

```bash
npm install
```

## 2. 設定ファイルの準備

`wrangler.toml.template` を `wrangler.toml` にコピーします。

自分の値に置き換える項目:

- Worker 名
- D1 database id
- R2 bucket 名
- account 変数
- workspace hostname
- share hostname

公開文書で使う推奨 placeholder:

- workspace: `console.example.com`
- share: `relay.example.net`

## 3. Database schema の適用

```bash
npx wrangler d1 execute burnbox --remote --file=./migrations/0001_initial.sql
npx wrangler d1 execute burnbox --remote --file=./migrations/0002_upload_plans.sql
npx wrangler d1 execute burnbox --remote --file=./migrations/0003_multipart_uploads.sql
npx wrangler d1 execute burnbox --remote --file=./migrations/0004_share_public_handle.sql
```

ローカル D1 を使う場合:

```bash
npx wrangler d1 execute burnbox --local --file=./migrations/0001_initial.sql
npx wrangler d1 execute burnbox --local --file=./migrations/0002_upload_plans.sql
npx wrangler d1 execute burnbox --local --file=./migrations/0003_multipart_uploads.sql
npx wrangler d1 execute burnbox --local --file=./migrations/0004_share_public_handle.sql
```

## 4. 本番 secrets の設定

```bash
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put SESSION_SECRET
npx wrangler secret put SHARE_LINK_SECRET
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
```

## 5. ローカル開発用 secrets の設定

プロジェクトルートに `.dev.vars` を作成します。

```env
ADMIN_PASSWORD=your-local-admin-password
SESSION_SECRET=your-long-random-session-secret
SHARE_LINK_SECRET=your-long-random-share-link-secret
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
```

これは `wrangler dev --remote` に必要です。

## 6. 開発開始

```bash
npm run dev
```

## 7. システム確認

2.1.1 の確認ポイント:

- workspace にログインする
- テストファイルをアップロードする
- multipart upload が finalization まで進む
- file list に表示される
- share を作成する
- stable link が public share domain を使う
- stable link が `/h/{publicHandle}` になる
- 開くと直接 download が始まる
- 別ブラウザまたは別端末から見ても `Copy link` が出る
- revoke してリンクが止まることを確認する

## 8. リンクモデルを理解する

BurnBox の公開共有リンクには現在 3 つの概念があります。

- `/h/{publicHandle}`: 既定の stable link
- `/s/{token}`: 旧互換リンク
- `{publicHandle}.relay.example.net`: 明示的に有効化した場合の hostname 型リンク

設計理由は次を参照してください。

- [共有リンク配信アーキテクチャ](share-link-delivery.md)
- [並行チャンク分割アップロード設計](concurrent-chunked-upload.md)
