# 開発計画

*最終更新: April 13, 2026 at 6:06 AM PDT*

## 現在の基準

BurnBox 2.2.1 では、次の 3 本を現在の近接開発軸として持ちます。

- Cloudflare Workers、R2、D1 上で安定した multipart upload baseline
- すでに導入済みの owner account 認証基盤を磨く account-security 改善
- private entry と upload diagnostics を入れた現在基準を壊さずに保つ maintainability 改善

直近の検証では、`4.3 GB / 870 parts` および `11 GB / 2200 parts` までの転送が、以前のような中途 oscillation を起こさずに完了しています。

この結果により、次の問いは変わりました。もはや「大容量 upload が可能か」を証明する段階ではありません。次は、中断後の再開コストと不確実性を下げる段階です。

## 次の実装目標

次の正式な実装目標は次の 3 つです。

1. frontend-JS の整理
2. email-based recovery と account UX の改善
3. resumable upload、すなわち中断後も継続できる upload

owner claim と legacy upgrade はすでに product 内で完結するようになっています。2.2.1 では private-entry routing と upload cleanup も入りましたが、frontend-JS の大きな整理はまだ残っています。次は recovery をより自然な体験に寄せつつ、現行の security baseline を崩さないことが課題です。

また BurnBox は、browser error、page refresh、mid-transfer network failure の後に upload 全体を最初からやり直すのではなく、server-side の durable state から継続できるようにする必要があります。

## 計画している作業

### 1. frontend-JS maintainability pass

- 現在の monolithic workspace script を、product behavior を変えずに分離する
- `boot.apiBase` と prefixed private-entry routing を private API path の唯一の基準として保つ
- `Logout`、`Refresh`、upload、share、account control を prefixed route 下でも安定させる

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
