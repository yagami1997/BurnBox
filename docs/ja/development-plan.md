# 開発計画

*最終更新: April 14, 2026 at 5:03 AM PDT*

## 現在の基準

BurnBox 2.3.0 では、5 つの工学層がすべて完成しました。

- Cloudflare Workers、R2、D1 上で安定した multipart upload baseline
- 導入済みの owner account 認証基盤（deployment password モデルから移行済み）
- private entry と upload diagnostics による運用可視性の確立
- frontend-JS の整理完了 — workspace インラインスクリプトを責務別モジュールに分離
- resumable upload — サーバーが確認済み part truth の権威を持ち、中断後もゼロから再送せず継続できる upload

直近の検証では、`4.3 GB / 870 parts` および `11 GB / 2200 parts` までの転送が安定して完了しています。resumable upload は中断・page refresh のシナリオで検証済みです。

## 完了済み実装

### 1. frontend-JS maintainability pass

**2.2.2 で完了。** monolithic workspace script を `helpers`、`share`、`files`、`upload`、`boot-wiring` の 5 つのクライアントモジュールに分離しました（`src/lib/client/` 以下）。product behavior の変更はありません。

### 2. resume 状態取得 endpoint

**2.3.0 で完了。** `GET /api/files/upload-status?fileId=` は、durable な `upload_parts` state から確認済み part 一覧、plan status、total parts、next-part pointer を返します。サーバーが権威を持ちます。

### 3. client-side resume 動作

**2.3.0 で完了。** upload client は part loop 開始前に upload status を問い合わせ、確認済み part をスキップします。進捗表示は実際の再開位置に合わせて整合されます。`init-upload` 後に `localStorage` へ upload plan の識別子・ファイル名・サイズ・chunk geometry を記録します。page refresh 後、ファイル名とサイズが一致するファイルを選ぶと自動的に resume が始まります。追加操作は不要です。

### 4. completion correctness

**2.3.0 で完了。** resume バナーを dismiss すると `abort-upload` が呼ばれ、R2 の incomplete multipart と D1 の upload plan が即座に削除されます。resumable 転送中も既存の `upload_parts` truth model は維持されます。multipart completion は引き続き durable な server-side part records に依存します。

### 5. operator experience hardening

**2.3.0 で完了。**
- Claim ページ: workspace 入室前に必須の確認 checkbox、`CLAIM_KEY` を設定していない operator 向けの setup key 出所説明
- Deployment status カード: ログイン済みオーナーに対し private entry、workspace host、share host、`SHARE_LINK_SECRET` 設定状態（未設定時は警告）、recovery email、hostname sharing の状態を表示
- 初回デプロイ案内バナー: workspace が `/` で動作している場合に `APP_ENTRY_PATH` の設定を案内する一度限りのバナーを表示

## 次の実装目標

優先順位順：

1. **email-based account recovery** — mail channel を明示的に設定した場合の email 経由の recovery を追加する（backup code は引き続き緊急用フォールバック）
2. **ネットワーク復旧後の自動 resume** — page refresh や操作なしで、part 失敗後のネットワーク再接続から自動的に再開する（2.4.0 候補）
3. **cross-device resume semantics** — 異なるデバイスが同じ upload plan に再入場する場合の durable state の定義（longer-term）

## 2.3.0 で変更されたファイル

- `src/worker.js` — 新規ルート `GET /api/files/upload-status`
- `src/lib/files.js` — 新規関数 `getUploadStatus()`
- `src/lib/client/upload.js` — resume 処理: upload-status 問い合わせ、確認済み part スキップ、進捗整合
- `src/lib/client/boot-wiring.js` — `localStorage` ヘルパー、resume バナー、ファイル一致検知
- `src/lib/layout.js` — deployment status カード、初回デプロイバナー、`renderAppPage` への `deployment` prop 追加
- `src/lib/auth-layout.js` — backup code 確認 checkbox、setup key 出所案内

## 最初の resumable pass で意図的に範囲外とするもの

- cross-device recovery semantics
- background upload orchestration・自動 resume on reconnect
- share system の大規模再設計
- 関連の薄い開発フロー拡張
