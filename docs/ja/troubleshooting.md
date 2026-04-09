# トラブルシューティング

*最終更新: April 9, 2026 at 12:49 AM PDT*

## アップロード後にファイルが表示されない

確認してください。

- D1 migration が適用されているか
- `complete-upload` が成功しているか
- Worker が期待した環境に接続しているか

## 直接アップロードに失敗する

確認してください。

- R2 CORS 設定
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- account id と bucket 名

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
