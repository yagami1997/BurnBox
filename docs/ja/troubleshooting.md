# トラブルシューティング

*最終更新: April 13, 2026 at 6:57 PM PDT*

## アップロード後にファイルが表示されない

確認してください。

- `0003_multipart_uploads.sql` を含む D1 migration が適用されているか
- `complete-upload` が成功しているか
- Worker が期待した環境に接続しているか
- まだ finalization 中ではないか

## 高い進捗率で止まって見える

BurnBox は chunk transfer と final object finalization を分離しています。高い進捗率の後に finalizing 表示へ変わる場合、ファイル本体の転送は終わっており、Worker が R2 multipart 組み立てと D1 書き込みを実行しています。

## Chunked upload に失敗する

確認してください。

- production secrets が正しいか
- `wrangler dev --remote` を使う場合、`.dev.vars` があるか
- Worker route が最新か
- 古いキャッシュ済み frontend bundle を見ていないか
- D1 に upload plan と upload part 用 schema があるか

現在の baseline に関する注意:

- BurnBox 2.3.0 は `4.3 GB / 870 parts` および `11 GB / 2200 parts` までの大容量 multipart baseline を引き継いでいます
- 新しい failure が出た場合、まず「大容量 upload 自体が非対応」ではなく、recoverability または環境固有の問題として扱ってください
- resumable upload が利用可能になりました。upload が中断された場合、ページをリロードして同じファイルを選ぶとサーバー側の確認済み断点から resume します

## migration で duplicate column エラーが出る

`0003_multipart_uploads.sql`、`0004_share_public_handle.sql`、または `0005_owner_auth.sql` の実行時に duplicate column / duplicate index エラーが出る場合、D1 にはすでに必要な schema が入っている可能性があります。同じ migration を繰り返し実行する前に live schema を確認してください。

## 共有リンク作成でエラーになる

確認してください。

- ファイルがまだ存在しているか
- D1 schema が最新か
- `0004_share_public_handle.sql` が適用済みか
- share payload が正しいか
- `SHARE_BASE_URL` が設定されているか

## share link が `503` を返す

workspace login が正常でも、公開 download 側の設定不足で起こることがあります。

確認してください。

- デプロイ済み Worker に `SHARE_LINK_SECRET` が入っているか
- public share host が最新 Worker version に向いているか
- `ALLOWED_SHARE_HOSTS` に exact public share host が入っているか
- `SHARE_BASE_URL` がその same public share host を指しているか

以前 `SESSION_SECRET` への fallback に依存していた環境では、まず `SHARE_LINK_SECRET` 未設定を疑ってください。

## active share があるのに `Copy link` が出ない

確認してください。

- active share が `public_handle` 対応後に作られているか
- `0004_share_public_handle.sql` が適用済みか
- workspace file list が最新 deployment から配信されているか
- active share が expired / exhausted していないか

BurnBox 2.3.0 でも active link は `public_handle` から再構築されます。local browser cache には依存しません。

## prefixed private workspace route が開かない

確認してください。

- `APP_ENTRY_PATH` が `/` で始まっているか
- `APP_ENTRY_PATH` が `/` で終わっていないか
- `APP_ENTRY_PATH` が単独の `/` になっていないか
- workspace action が最新 deployment の frontend から読み込まれているか
- workspace host 側の Worker deployment が最新か

変数修正後も開かない場合は、private route map と描画済み `apiBase` を一致させるために Worker を再デプロイしてください。

## 公開共有リンクが意図しない host を開く

確認してください。

- `SHARE_BASE_URL` が public share hostname を指しているか
- `APP_BASE_URL` が workspace hostname を指しているか
- `ALLOWED_APP_HOSTS` と `ALLOWED_SHARE_HOSTS` が意図した split に一致しているか

## hostname 型共有リンクが SSL エラーになる

典型症状:

- `ERR_SSL_VERSION_OR_CIPHER_MISMATCH`
- `https://abc123.relay.example.net` で TLS handshake failure

確認:

- wildcard DNS が proxied か
- wildcard Worker route があるか
- wildcard certificate coverage が本当にあるか

証明書戦略を明示的に用意していない場合は、次の stable path 型共有へ戻してください。

- `https://relay.example.net/h/{publicHandle}`

## share domain から admin route が見える

確認してください。

- Worker deployment が最新か
- `ALLOWED_SHARE_HOSTS` が exact public share host だけを含んでいるか
- public share host が workspace host と同じ Worker version に向いているか

public share host は `/api/*` や workspace root を出してはいけません。

## route のデプロイに失敗する

確認してください。

- route が別 Worker に割り当てられていないか
- `wrangler.toml` の `zone_name` または `zone_id` が正しいか

## ローカル開発と本番の挙動が違う

remote development を推奨します。

```bash
npm run dev
```

このリポジトリは local/remote binding mismatch を減らすため、既定で `wrangler dev --remote` を使います。

## 古いファイルが一覧に出てこない

現在の registry view は、削除されていない最新 100 件までを返します。より大きな archive を扱う場合は、UI を本番利用する前に pagination を追加してください。

## claim または upgrade flow が表示されない

workspace が claim prompt や upgrade prompt を出さず、そのまま login page を表示する場合は次を確認してください。

- 正しい D1 database がデプロイ済み Worker に bind されているか
- `0005_owner_auth.sql` が適用済みか
- Worker deployment が最新か

## claim token が拒否される

確認してください。

- `CLAIM_KEY` が Worker secret に設定した値と一致しているか
- token がすでに使用済みではないか。各 token は one-time claim のみに有効です
- `CLAIM_KEY` を設定していない場合、初回 workspace visit 時に Worker log へ出力された自動生成 token を取得しているか

## `Upgrade your BurnBox security` が表示されない

確認してください。

- デプロイ済み Worker に `ADMIN_PASSWORD` がまだ設定されているか
- workspace state が `upgrade_required` であり、すでに `active` ではないか
- `0005_owner_auth.sql` が適用済みか

## recovery codes page に code が表示されない

確認してください。

- `0005_owner_auth.sql` が適用済みか
- owner account が migration 適用後に作成されているか
- 必要なら account card の `Generate Backup Codes` から新しい set を発行する
