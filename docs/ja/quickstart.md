# クイックスタート

*最終更新: April 13, 2026 at 6:57 PM PDT*

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
- optional `APP_ENTRY_PATH`

公開文書で使う推奨 placeholder:

- workspace: `console.example.com`
- share: `relay.example.net`
- optional private entry prefix: `/ops`

## 3. Database schema の適用

以下の `burnbox` は、既定名を使っていない場合は自分の D1 database 名に置き換えてください。

```bash
npx wrangler d1 execute burnbox --remote --file=./migrations/0001_initial.sql
npx wrangler d1 execute burnbox --remote --file=./migrations/0002_upload_plans.sql
npx wrangler d1 execute burnbox --remote --file=./migrations/0003_multipart_uploads.sql
npx wrangler d1 execute burnbox --remote --file=./migrations/0004_share_public_handle.sql
npx wrangler d1 execute burnbox --remote --file=./migrations/0005_owner_auth.sql
```

ローカル D1 を使う場合:

```bash
npx wrangler d1 execute burnbox --local --file=./migrations/0001_initial.sql
npx wrangler d1 execute burnbox --local --file=./migrations/0002_upload_plans.sql
npx wrangler d1 execute burnbox --local --file=./migrations/0003_multipart_uploads.sql
npx wrangler d1 execute burnbox --local --file=./migrations/0004_share_public_handle.sql
npx wrangler d1 execute burnbox --local --file=./migrations/0005_owner_auth.sql
```

## 4. 本番 secrets の設定

```bash
npx wrangler secret put SESSION_SECRET
npx wrangler secret put SHARE_LINK_SECRET
npx wrangler secret put CLAIM_KEY
```

`SHARE_LINK_SECRET` は公開 download に必須です。これがないと、workspace login が正常でも share link は `503` を返します。
`CLAIM_KEY` は初回 owner claim 用の one-time setup key です。長期ログイン用パスワードとしては扱いません。
`CLAIM_KEY` を設定しない場合、workspace への初回アクセス時に one-time claim token が生成され、Worker log に書き出されます。

## 5. ローカル開発用 secrets の設定

プロジェクトルートに `.dev.vars` を作成します。

```env
SESSION_SECRET=your-long-random-session-secret
SHARE_LINK_SECRET=your-long-random-share-link-secret
CLAIM_KEY=your-one-time-local-claim-key
```

これは `wrangler dev --remote` に必要です。

## 6. 開発開始

```bash
npm run dev
```

## 7. システム確認

主要 flow の確認:

- workspace を開く
- 新規デプロイなら `Claim your BurnBox` を完了する
- 旧環境のアップグレードなら `Upgrade your BurnBox security` を完了する
- owner login が成功する
- この deployment で `Recovery email` を使うか、backup code のみを recovery path にするかを決める
- `Change password`、`Generate Backup Codes`、`Sign Out Other Devices` が動作する
- email recovery を使う方針なら、workspace account card から recovery email を追加・更新できる
- `APP_ENTRY_PATH` を使う場合、その prefixed route でも workspace が正常動作する
- テストファイルをアップロードする
- multipart upload が finalization まで進む
- 現在の baseline が大容量転送でも目立つ oscillation なく進むことを確認する
- file list に表示される
- share を作成する
- stable link が public share domain を使う
- stable link が `/h/{publicHandle}` になる
- 開くと直接 download が始まる
- `503` になる場合は、デプロイ済み Worker に `SHARE_LINK_SECRET` が入っているか確認する
- 別ブラウザまたは別端末から見ても `Copy link` が出る
- revoke してリンクが止まることを確認する

## 8. リンクモデルを理解する

BurnBox の公開共有リンクには現在 3 つの概念があります。

- `/h/{publicHandle}`: 既定の stable link
- `/s/{token}`: 旧互換リンク
- `{publicHandle}.relay.example.net`: 明示的に有効化した場合の hostname 型リンク

設計理由は次を参照してください。

- [共有リンク配信アーキテクチャ](share-link-delivery.md)
- [アーキテクチャ](architecture.md)
- [並行チャンク分割アップロード設計](concurrent-chunked-upload.md)
- [開発計画](development-plan.md)
