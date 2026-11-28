# suzushiro

水無瀬組サーバー向けの Discord Bot。おみくじ・ランダム・今日のコンテンツと、ポイント制ゲーム（ランキング・履歴）を統合している。Bot アカウント名は「水無瀬組」。

| 項目 | 内容 |
| --- | --- |
| バージョン | 1.0.0 |
| 状態 | 本番稼働中 |
| 稼働先 | 台3 minase（pm2: suzushiro） |
| 実装 | JavaScript（Node.js 20+, discord.js 14, better-sqlite3） |

## Discord 機能

- `/omikuji` / `!omikuji` / `おみくじ`: 今日の運勢
- `/random` / `random` / `ランダム`: ランダムなひとこと
- `/today` / `today` / `今日`: 今日の○○（テーマ・ラッキーアイテムなど）
- `/game`: サイコロ、コイントス、じゃんけん、HIGH & LOW、スロット、拡張ゲーム（Blackjack / Roulette / Quiz / 数字当て）
- `/profile`: ポイント、プレイ数、勝敗、勝率
- `/ranking`: ポイントランキング
- `/game-points`: 管理者によるポイント調整
- `/game-logs`: 管理者によるゲーム履歴確認
- `/game-stats`: 管理者によるゲーム統計
- プレゼンス表示は1分周期で切り替わる（下記「プレゼンス」参照）
- 実行ログ（`[exec]`）を標準出力へ出力する（下記「実行ログ」参照）

## コマンド

| コマンド | 権限 | 説明 |
| --- | --- | --- |
| `/omikuji` | 全員 | 今日の運勢を引く（7種の運勢、等確率） |
| `/random` | 全員 | 今日のひとことガチャ（5%で激レア） |
| `/today` | 全員 | 今日の○○（5%で超レア） |
| `/game` | 全員（DM不可） | ミニゲームのメニューを開く |
| `/profile [user]` | 全員 | 自分または指定ユーザーの戦績を表示 |
| `/ranking` | 全員 | ポイントランキング（上位10件） |
| `/game-points <user> <amount> <reason>` | サーバー管理 | ポイントを加算・減算する（±1,000,000まで、理由必須） |
| `/game-logs [user] [game]` | サーバー管理 | ゲーム履歴を最新20件まで表示 |
| `/game-stats` | サーバー管理 | ゲーム統計（総ゲーム数・流通ポイント・ゲーム別内訳）を表示 |

テキスト（プレフィックス）コマンドも使える。入力テキストと完全一致したときだけ反応する。

| 入力 | コマンド |
| --- | --- |
| `!omikuji` / `おみくじ` | `/omikuji` |
| `random` / `ランダム` | `/random` |
| `today` / `今日` | `/today` |

## ゲームとポイント

新規ユーザーの初期ポイントは100pt。負けて残高がマイナスになるゲームは実行できない。

| ゲーム | 勝ち | 負け | 引き分け | 備考 |
| --- | --- | --- | --- | --- |
| サイコロ | +10 | -5 | 0 | Botと1〜6の出目勝負 |
| コイントス | - | - | 0 | 結果表示のみ（引き分け扱い） |
| じゃんけん | +15 | -5 | 0 | |
| HIGH & LOW | +20 | -5 | 0 | 同じ数字は引き分け |
| スロット | +15 | -5 | - | 3つ揃いでジャックポット +50 |
| Blackjack | +25 | -10 | +5 | ディーラーは17以上で停止 |
| Roulette | +20 | -10 | - | 赤・黒・緑の色当て |
| Quiz | +15 | -5 | - | 4択クイズ |
| 数字当て | +20 | -5 | - | 1〜6を3回まで、大小ヒント付き |

## 環境変数

| 変数 | 必須 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `DISCORD_TOKEN` | ○ | - | Bot のトークン。未設定だと起動しない |
| `DB_BACKUP_ON_START` | | `true` | 起動時に DB バックアップを取るか（`false` で無効） |
| `DB_BACKUP_RETENTION` | | `10` | バックアップの保持世代数（最小1） |
| `SUZUSHIRO_DATA_DIR` | | `src/data` | DB とバックアップの保存先 |
| `MABUSABA_DATA_DIR` | | - | 旧互換の保存先指定（`SUZUSHIRO_DATA_DIR` が優先） |
| `DEFAULT_COMMAND_CHANNELS` | | （制限なし） | 全コマンド共通の許可チャンネルID（カンマ・空白区切り） |
| `COMMAND_CHANNELS_<NAME>` | | - | コマンド別の許可チャンネルID（例: `COMMAND_CHANNELS_GAME`） |

`.env.example` に雛形がある。Discord Developer Portal では、プレフィックスコマンド用に **Message Content Intent** を有効化すること。

## コマンドの実行チャンネル制限

コマンドごとに「実行できるチャンネル」を環境変数で制限できる（ギルドの入口を絞りたい場合用）。設定が無ければ全チャンネルで実行できる。

- 変数名は `COMMAND_CHANNELS_` + コマンド名の大文字（英数字以外は `_`）。例: `/game-logs` → `COMMAND_CHANNELS_GAME_LOGS`、`/game` → `COMMAND_CHANNELS_GAME`
- コマンド別設定が無い場合は `DEFAULT_COMMAND_CHANNELS` が使われる。どちらも未設定・空なら制限なし
- チャンネルIDはカンマ区切り／空白区切りで複数指定可。17〜20桁の数字以外は無視される
- スレッド内での実行は、親チャンネルが許可されていれば実行できる
- 制限に引っかかった場合、スラッシュコマンドとボタン操作には「❌ `/game` は #チャンネル でのみ実行できます。」という案内（自分にだけ見える）が返る。テキストコマンドは案内も出さず無視される
- ボタン操作は `/game` の許可設定で判定される

## 実行ログ

コマンドが実行されるたびに、標準出力へ1行の実行ログを出す。

```
[exec] 2026-11-23T00:00:00.000Z cmd=omikuji route=prefix guild=<id> channel=<id> user=<id> result=ok
```

- `route` は `slash`（スラッシュコマンド）か `prefix`（テキストコマンド）
- 失敗時は `result=error` と `error="<先頭行>"`（120文字まで）が付く
- ユーザーの入力テキストそのものは記録しない
- チャンネル制限で弾かれたスラッシュコマンドも `result=ok` で記録される（制限は正常な拒否として扱う）

## データとバックアップ

- DB ファイルは `games.db`（SQLite、WAL モード）。テーブルは `users`（ポイントと戦績）と `game_logs`（履歴）
- 起動時に自動で移行が走る: バックアップ → 整合性チェック → 不足しているテーブル・列の追加（既存行数は不変）→ スキーマ版数（`schema_meta`、現在 3）の記録 → 整合性チェック
- バックアップは `<データ保存先>/backups/<UTC時刻>/` に世代管理され、保持世代数を超えた古いものは削除される
- 手動確認: `npm run db:check`（移行と整合性チェック）、`npm run db:backup`（バックアップ付きで実行）

## プレゼンス

ステータスは **Playing（プレイ中）** で、1分周期で次の2表示を交互に切り替える。

- `<Bot名> | 起動して <経過時間>`（例: `起動して 1時間26分`。1時間未満は `<n>分` のみ）
- `<Bot名> | 現在時刻 HH:MM JST`

分境界の約200ms前に次の表示を先行送信し、境界ちょうどに切り替わるようにしている。経過時間の起点はプロセス起動時（最初の ready）で固定される。

## セットアップと開発

```bash
npm ci          # 依存関係のインストール
cp .env.example .env   # DISCORD_TOKEN を設定
npm start       # 起動
npm run check   # 全ソースの構文チェック
npm test        # 統合検証（DB移行・チャンネル制限・コマンド定義・実行ログ・ゲームデータ）
```

ワンコマンドビルド（依存インストール → 構文チェック → テスト）:

```bash
./build.sh      # Windows は build.bat
```

## ディレクトリ構成

```
src/
  index.js            エントリポイント（スラッシュ／プレフィックス／ボタン処理）
  omikuji.js          おみくじのデータと抽選
  random.js           ひとことガチャのデータと抽選
  today.js            今日の○○のデータと抽選
  presence-cycle.js   プレゼンスの1分サイクル
  commands/           ゲーム系スラッシュコマンド（game, game-points, game-logs, game-stats, profile, ranking）
  games/              ゲームロジック（dice, coin, rps, highlow, slots, blackjack, roulette, quiz, numberGuess）
  utils/              database（移行・バックアップ）, gameData, gamePoints, gameManager, channelPolicy, execLog
scripts/
  verify-game-integration.js   統合検証（npm test）
```

## 判断記録

- 2026-11-28: 統一開発フローに沿って旧 v1.2.2 から全面再実装し、バージョンを 1.0.0 に振り直した。機能・ポイント配分・データ形式は旧実装と同一に保ち、pm2 アプリ名（`suzushiro`）と DB ファイル名（`games.db`）も運用互換のため据え置いた。詳細は DESIGN.md を参照。
- 2026-11-28: プレゼンスの説明を実態（1分サイクル）に合わせて修正した。旧 README には Watching「/help | {ping}ms」を5分間隔で更新する旨が残っていたが、実装は既にサイクル方式へ移行済みだった。
