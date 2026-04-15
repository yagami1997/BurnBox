# BurnBox リリース前チェックリスト

*最終更新: April 14, 2026 at 6:29 PM PDT*

## 2.3.1 アップグレードノート

BurnBox 2.3.1 は文書とメタデータのパッチです。新しい D1 マイグレーション、新しい環境変数、API 変更、デプロイモデルの変更はありません。

2.3.0 からのアップグレード手順:

- 新しい Worker ビルドをデプロイする（`wrangler deploy`）
- データベース変更不要
- secrets 変更不要
- `docs/en/maintenance.md` を確認し、デプロイのコンプライアンス要件に応じた D1 定期クリーンアップのスケジューリングを検討する

---

## 2.3.0 アップグレードノート

BurnBox 2.3.0 は resumable upload、deployment status カード、Claim ページ UX 強化、初回デプロイ案内バナーを追加します。新しい D1 マイグレーション、新しい環境変数、デプロイモデルの変更はありません。

2.2.2 からのアップグレード手順:

- 新しい Worker ビルドをデプロイする（`wrangler deploy`）
- upload、resume バナー、Deployment カード、Logout が正常動作することを確認する
- データベース変更不要
- secrets 変更不要

---

## 2.2.2 アップグレードノート

BurnBox 2.2.2 は frontend-JS の maintainability pass リリースです。新しい D1 マイグレーション、新しい環境変数、デプロイモデルの変更はありません。

2.2.1 からのアップグレード手順:

- 新しい Worker ビルドをデプロイする（`wrangler deploy`）
- 既存の workspace 操作がすべて正常動作することを確認する：Logout、Refresh、upload、share create/revoke、account security panel
- データベース変更不要
- secrets 変更不要

---

## 2.2.1 フルチェックリスト

BurnBox 2.2.1 以降を共有環境へ初めて上げる前に、このチェックリストを使って確認してください。

## Environment

- `SESSION_SECRET` が設定されている
- `SHARE_LINK_SECRET` が設定されている
- `APP_BASE_URL`、`SHARE_BASE_URL`、`ALLOWED_APP_HOSTS`、`ALLOWED_SHARE_HOSTS` が想定どおりの値になっている
- private workspace entry prefix を使う場合、`APP_ENTRY_PATH` が意図した route prefix に設定されている
- log-generated claim code を使わない場合は、one-time setup secret として `CLAIM_KEY` が設定されている

## Database

- `migrations/0005_owner_auth.sql` を含め、migration が順番どおりに適用されている
- D1 に owner-auth 関連テーブル `owner_account`、`claim_tokens`、`recovery_codes`、`auth_events` が存在する
- 既存デプロイでも file / share 系の既存テーブルが維持されている

## New Deployment Flow

- account がまだ存在しない状態で workspace を開く
- アプリが `Claim your BurnBox` を表示する
- owner email、password、confirm、claim code を入力して claim を完了する
- response で recovery codes が一度だけ返り、claim token が再利用できない
- リロードすると claim form ではなく authenticated owner workspace が表示される

## Upgrade Flow

- まだ legacy `ADMIN_PASSWORD` path を使っているデプロイから開始する
- owner login form ではなく upgrade login entry が表示される
- legacy password で sign in すると `Upgrade your BurnBox security` に進む
- owner email、password、confirm、recovery-code generation を含めて upgrade を完了する
- 以後の login が legacy password ではなく owner email + password に切り替わる

## Recovery and Session Controls

- `Reset with recovery code` が有効な owner email と未使用 recovery code を受け付ける
- 一度使った recovery code を再利用できない
- 無効な recovery 試行 5 回で一時ロックがかかる
- この deployment で `Recovery email` を使うか決める。使わないなら backup code のみを intentional な recovery path として確認し、使うなら workspace account card から追加または削除できることを確認する
- `Change password` で session version が更新され、古い session が無効化される
- `Sign Out Other Devices` が現在の session を保持したまま他デバイスの session を無効化する
- `Regenerate recovery codes` が現在の set を置き換え、新しい一覧を一度だけ返す

## Share and Workspace Regression

- file を upload し、multipart upload が今までどおり完了する
- `APP_ENTRY_PATH` を有効にしている場合、workspace がその prefixed route から開き、`/` では private workspace が露出しない
- prefixed workspace route 上でも `Logout`、`Refresh`、upload が正常動作する
- upload を意図的に中断したとき、failed multipart session が静かに残留し続けない
- share link を作成し、public URL が share domain から解決される
- download limit と expiration が今までどおり機能する
- file を削除すると関連 share link も revoke される

## Security Regression

- owner login failure が generic な `invalid_credentials` reason で記録される
- legacy upgrade login が繰り返し失敗した場合に `429` を返す
- bad email / bad code の recovery reset が generic invalid-details error を返す
- auth/session response に `passwordHash` や `passwordAlgo` が含まれない
- valid な owner session なしで private workspace が表示されない
