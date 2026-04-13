# BurnBox 2.2.0 リリース前チェックリスト

*最終更新: April 12, 2026 at 6:31 PM PDT*

BurnBox 2.2.0 を共有環境へ上げる前に、このチェックリストを使って確認してください。

## Environment

- `SESSION_SECRET` が設定されている
- `SHARE_LINK_SECRET` が設定されている
- `APP_BASE_URL`、`SHARE_BASE_URL`、`ALLOWED_APP_HOSTS`、`ALLOWED_SHARE_HOSTS` が想定どおりの値になっている
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
- workspace account card から `Recovery email` を追加または削除できる
- `Change password` で session version が更新され、古い session が無効化される
- `Sign Out Other Devices` が現在の session を保持したまま他デバイスの session を無効化する
- `Regenerate recovery codes` が現在の set を置き換え、新しい一覧を一度だけ返す

## Share and Workspace Regression

- file を upload し、multipart upload が今までどおり完了する
- share link を作成し、public URL が share domain から解決される
- download limit と expiration が今までどおり機能する
- file を削除すると関連 share link も revoke される

## Security Regression

- owner login failure が generic な `invalid_credentials` reason で記録される
- legacy upgrade login が繰り返し失敗した場合に `429` を返す
- bad email / bad code の recovery reset が generic invalid-details error を返す
- auth/session response に `passwordHash` や `passwordAlgo` が含まれない
- valid な owner session なしで private workspace が表示されない
