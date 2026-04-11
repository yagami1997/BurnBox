# 共有リンク配信アーキテクチャ

*最終更新: April 10, 2026 at 7:14 PM PDT*

## 問題設定

BurnBox は当初、share link を現在の request origin から生成していました。この方法は単純ですが、3つの問題がありました。

- 公開リンクが workspace hostname を露出する
- 公開面と private 管理面の境界が曖昧になる
- token path のリンクを別端末で再構築できない

BurnBox 2.1.0 では、これを直すために share system を作り直しました。

## 設計目標

- admin workspace を private に保つ
- 公開 share link を別 hostname に出す
- 受信者には direct download を維持する
- 既存の share link を壊さない
- active share link を database state から再構築できるようにする
- 将来の privacy-oriented hostname delivery に拡張余地を残す

## なぜ token link だけでは足りなかったか

BurnBox は share token の平文を保存せず、SHA-256 hash だけを保存します。

これは capability URL として正しい性質ですが、副作用があります。

- share 作成後、server は `/s/{token}` を後から再構築できない

実際に起きた問題:

- 端末 A では share 作成時に full URL を local cache できる
- 端末 B では active share の存在は見える
- しかし端末 B では元の token URL を組み立て直せない

このため stable な public identifier が必要になりました。

## なぜ `public_handle` を導入したか

`public_handle` は secret ではありません。`shares` table に直接保存される stable public identifier です。

役割は token と異なります。

- token: capability の secret
- `public_handle`: 再構築可能な公開アドレス材料

これにより active share URL を D1 state から再生成でき、複数端末で `Copy link` を一貫して表示できます。

## 最終的に選んだ route

推奨 stable link は:

- `https://relay.example.net/h/{publicHandle}`

この route を選んだ理由:

- public share domain を使える
- D1 から再構築できる
- wildcard certificate を前提にしない
- 複数端末の運用に向いている

## なぜ hostname 型共有を既定にしないか

たとえば:

- `https://abc123.relay.example.net`

見た目は良いですが、routing と certificate のコストがあります。

- wildcard DNS が必要
- wildcard Worker route が必要
- 証明書カバレッジも必要
- Cloudflare Universal SSL だけでは十分でない場合がある

そのため BurnBox では hostname 型共有を opt-in 扱いにしています。

## 現在の配信フロー

1. operator が workspace で share を作成する
2. BurnBox は次を生成する
   - secret token
   - stable `public_handle`
3. 設定済み share domain 上の stable public URL を返す
4. 公開リクエストが share surface に到着する
5. Worker が share state を検証する
6. 短命の signed internal download URL を作る
7. share request は real download path へ即時 redirect される
8. Worker が R2 から file を返す

## なぜ landing page を既定から外したか

一時期は controlled share landing page を導入しました。view と download を分離しやすい利点はありましたが、期待される UX には重すぎました。

最終判断:

- 内部の signed download step は維持する
- 強制 landing page は外す
- 「リンクを開いたらすぐ download」が既定

期限切れ、revoke、利用不可のリンクでは専用エラー応答を返します。

## 互換性戦略

BurnBox は既存リンクを原則壊しません。

現在の互換モデル:

- `/h/{publicHandle}` が新しい stable link
- `/s/{token}` は既存共有の互換用として維持
- hostname 型リンクは deployment ごとの任意機能

## Host 分離モデル

Worker は host ごとに役割を分けます。

- workspace host
  - admin UI
  - 認証済み `/api/*`
- share host
  - 公開 share URL
  - admin UI を出さない
  - 認証 API を出さない

これは 2.1.0 の主要な privacy 改善です。

## Operator にとっての効果

2.1.0 の変更により:

- 受信者は direct download を使える
- operator は別端末からでも active share をコピーできる
- 公開リンクが workspace hostname を出さずに済む

## 将来の拡張ポイント

- より強い share analytics
- nonce 付き download start
- 別の public-share host 戦略
- view / download 監査ポリシーの強化
- 証明書戦略込みの hostname 型共有

軽々しく変えてはいけない点:

- plaintext token を保存すること
- private workspace と public share routing を再び曖昧にすること
- active-link 表示を local browser cache に戻すこと
