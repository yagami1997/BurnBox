# トラブルシューティング

*最終更新: April 9, 2026 at 5:42 AM PDT*

## アップロード後にファイルが表示されない

確認してください。

- `0003_multipart_uploads.sql` を含む D1 migration が適用されているか
- `complete-upload` が成功しているか
- Worker が期待した環境に接続しているか
- まだ finalization 中ではないか

## 高い進捗率で止まって見える

BurnBox は chunk transfer と finalization を分離して扱います。高い進捗率の後に finalizing 表示へ切り替わる場合、ファイル本体の転送は終わっており、Worker が R2 multipart 組み立てと D1 書き込みを実行しています。

## Chunked upload に失敗する

確認してください。

- production secrets が正しいか
- `wrangler dev --remote` を使う場合、ローカルに `.dev.vars` があるか
- Worker route が最新か
- 古いキャッシュ済みフロントエンドを見ていないか
- D1 に upload plan と upload part 用スキーマがあるか

## migration で duplicate column エラーが出る

`0003_multipart_uploads.sql` 実行時に duplicate column エラーが出る場合、D1 にはすでに multipart 用の列がある可能性があります。同じ migration を繰り返し実行する前に、現在のテーブル構造を確認してください。

## 共有リンク作成でエラーになる

確認してください。

- ファイルがまだ存在しているか
- D1 スキーマが最新か
- `upload_plans` migration が適用済みか
- 共有作成 payload が正しいか

## ルートのデプロイに失敗する

確認してください。

- ルートが別 Worker に割り当てられていないか
- `wrangler.toml` の `zone_name` または `zone_id` が正しいか

## ローカル開発と本番の挙動が違う

このリポジトリはローカル/リモートの binding 差異を減らすため、既定で remote development を使います。

```bash
npm run dev
```

## 古いファイルが一覧に出てこない

現在の一覧画面は、削除されていない最新 100 件までを返します。より大きなアーカイブを運用する場合は、UI を本番運用に使う前に pagination を追加してください。
