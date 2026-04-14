# 開発計画

*最終更新: April 13, 2026 at 6:45 PM PDT*

## 現在の基準

BurnBox 2.2.2 では、4 つの工学層が完成し、残る近接開発軸は 1 本になりました。

- Cloudflare Workers、R2、D1 上で安定した multipart upload baseline
- 導入済みの owner account 認証基盤
- private entry と upload diagnostics による運用可視性の確立
- frontend-JS の整理完了 — workspace インラインスクリプトを責務別モジュールに分離

直近の検証では、`4.3 GB / 870 parts` および `11 GB / 2200 parts` までの転送が、以前のような中途 oscillation を起こさずに完了しています。

次の問いは明確です。中断後の再開コストと不確実性を下げること。その前提となる frontend モジュール境界はすでに整っています。

## 次の実装目標

次の正式な実装目標は次の 2 つです。

1. ~~frontend-JS の整理~~ **2.2.2 で完了**
2. resumable upload — 中断後も durable server-side state から継続できる upload
3. email-based recovery と account UX の改善

BurnBox は、browser error、page refresh、mid-transfer network failure の後に upload 全体を最初からやり直すのではなく、server-side の durable state から継続できるようにする必要があります。

## 計画している作業

### 1. frontend-JS maintainability pass

**2.2.2 で完了。** monolithic workspace script を `helpers`、`share`、`files`、`upload`、`boot-wiring` の 5 つのクライアントモジュールに分離しました（`src/lib/client/` 以下）。`layout.js` はこれらを import して組み合わせるのみになっています。product behavior の変更はありません。

### 2. Account recovery と product polish

- mail channel を明示的に入れる場合の email-based recovery を設計する
- workspace account card と auth surfaces をさらにコンパクトで分かりやすく整える
- backup code recovery を emergency fallback として維持する
- 既存の owner claim / legacy upgrade 動線は崩さず、日常運用の friction を下げる

### 3. recovery 指向の upload protocol

- client が upload plan の再開可否を問い合わせる方法を定義する
- server が durable part truth として何を返すかを定義する
- 再開可能な plan と再初期化が必要な plan を区別する

### 4. resume 状態取得 endpoint

- upload plan の状態を問い合わせる Worker route を追加する
- uploaded part numbers、plan status、declared size、chunk geometry を返す
- multipart truth の権威は server に残す

### 5. client-side resume 動作

- file 全体を再送せず、欠けている part だけを継続送信する
- page refresh や workspace 再入場後も継続できるようにする
- 既に durable な part を飛ばす場合でも、進捗表示を正直に保つ

### 6. completion correctness

- 最初の resumable 実装では現在の `upload_parts` truth model を維持する
- multipart completion は durable な server-side part records に依存させる
- browser 主導の completion state は導入しない

### 7. observability

- どの段で失敗したかを記録する: part transfer、plan lookup、multipart completion、metadata commit
- 一時的な揺らぎと、回復不能な state divergence を区別できるだけの operator-visible detail を出す

## 変更対象になりやすいファイル

- `src/worker.js`
- `src/lib/auth.js`
- `src/lib/session.js`
- `src/lib/files.js`
- `src/lib/layout.js`
- `src/lib/client/upload.js` — resumable upload の動作はここに入る
- `src/lib/client/boot-wiring.js` — resume UI の配線はここに入る
- `src/lib/auth-layout.js`
- `scripts/private-entry-smoke.mjs`
- resumable state に追加 index や metadata が必要なら新しい migration

## ドキュメントの追随

resumable upload が入ったら、少なくとも次を更新します。

- `README.md`
- `docs/en/architecture.md`
- `docs/en/concurrent-chunked-upload.md`
- `docs/en/quickstart.md`
- `docs/en/troubleshooting.md`
- `docs/ja/` 配下の対応文書

## 最初の resumable pass で意図的に範囲外とするもの

- cross-device recovery semantics
- background upload orchestration
- share system の大規模再設計
- 関連の薄い開発フロー拡張
