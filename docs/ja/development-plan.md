# 開発計画

*最終更新: April 12, 2026 at 4:26 AM PDT*

## 現在の基準

BurnBox 2.1.1 は Cloudflare Workers、R2、D1 上で安定した multipart upload の基準線を確立しました。

直近の検証では、`4.3 GB / 870 parts` および `11 GB / 2200 parts` までの転送が、以前のような中途 oscillation を起こさずに完了しています。

この結果により、次の問いは変わりました。もはや「大容量 upload が可能か」を証明する段階ではありません。次は、中断後の再開コストと不確実性を下げる段階です。

## 次の実装目標

次の正式な実装目標は断点续传、すなわち resumable upload です。

BurnBox は、browser error、page refresh、mid-transfer network failure の後に upload 全体を最初からやり直すのではなく、server-side の durable state から継続できるようにする必要があります。

## 計画している作業

### 1. recovery 指向の upload protocol

- client が upload plan の再開可否を問い合わせる方法を定義する
- server が durable part truth として何を返すかを定義する
- 再開可能な plan と再初期化が必要な plan を区別する

### 2. resume 状態取得 endpoint

- upload plan の状態を問い合わせる Worker route を追加する
- uploaded part numbers、plan status、declared size、chunk geometry を返す
- multipart truth の権威は server に残す

### 3. client-side resume 動作

- file 全体を再送せず、欠けている part だけを継続送信する
- page refresh や workspace 再入場後も継続できるようにする
- 既に durable な part を飛ばす場合でも、進捗表示を正直に保つ

### 4. completion correctness

- 最初の resumable 実装では現在の `upload_parts` truth model を維持する
- multipart completion は durable な server-side part records に依存させる
- browser 主導の completion state は導入しない

### 5. observability

- どの段で失敗したかを記録する: part transfer、plan lookup、multipart completion、metadata commit
- 一時的な揺らぎと、回復不能な state divergence を区別できるだけの operator-visible detail を出す

## 変更対象になりやすいファイル

- `src/worker.js`
- `src/lib/files.js`
- `src/lib/layout.js`
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
