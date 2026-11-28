# DESIGN — suzushiro 再実装の設計メモ

## 概要

旧 suzushiro（v1.2.2、本番＝台3 minase の稼働コード）を正として、統一開発フロー（Issue → ブランチ → PR → CI → リリース）に沿ったリポジトリ構成へゼロから再実装したもの。機能・データ形式・運用名は旧実装と同一に保ち、バージョンだけ 1.0.0 に振り直している。

- 言語・構成は旧実装のまま: JavaScript（CommonJS）、Node.js 20+、discord.js 14、better-sqlite3
- スラッシュコマンド9件（コンテンツ3＋ゲーム系6）、プレフィックスコマンド3種（別名込み6パターン）
- ゲーム9種（通常5＋拡張4）、ポイント制（初期100pt、負残高になる結果は拒否）
- DB は SQLite `games.db`（users / game_logs / schema_meta）、起動時移行＋世代バックアップ

## 旧→新 対応表

ファイル単位の対応。すべて新規に書き起こしており、旧ファイルのコピーは含まない。

| 旧（v1.2.2） | 新（v1.0.0） | 備考 |
| --- | --- | --- |
| `src/index.js` | `src/index.js` | 同一の振る舞い（起動チェック、ready、interactionCreate、messageCreate、エラー処理） |
| `src/omikuji.js` / `src/random.js` / `src/today.js` | 同左 | 収録データ（運勢7種・ひとこと通常10＋レア5・今日の○○通常10＋レア3）は文言まで同一 |
| `src/presence-cycle.js` | `src/presence-cycle.js` | 同一仕様（1分交互表示、境界200ms前先行送信） |
| `src/commands/game.js` | `src/commands/game.js` | メニュー、通常ゲーム5種、拡張ゲームのセッション管理・ボタン処理を再現 |
| `src/commands/game-points.js` / `game-logs.js` / `game-stats.js` / `profile.js` / `ranking.js` | 同左 | 権限チェック、表示形式、制限値（±1,000,000、履歴20件など）まで同一 |
| `src/games/*.js`（9ファイル） | 同左 | 判定ロジックと配点を同一に再現 |
| `src/utils/database.js` | 同左 | 移行手順（バックアップ→整合性→追加移行→版数記録→世代整理→再検査）とスキーマ版数3を同一に再現 |
| `src/utils/gameData.js` / `gamePoints.js` / `gameManager.js` | 同左 | ポイント表・トランザクション・負残高拒否を同一に再現 |
| `src/utils/channelPolicy.js` / `execLog.js` | 同左 | 環境変数名、ログ形式を同一に再現 |
| `scripts/verify-game-integration.js` | 同左 | 旧検証の範囲を再現し、検証項目を追加（下記判断記録7） |
| `package.json` / `ecosystem.config.cjs` / `build.sh` / `build.bat` | 同左 | バージョンのみ 1.2.2 → 1.0.0。pm2 アプリ名 `suzushiro` は据え置き |
| （なし） | `.env.example` | 新規作成（判断記録6） |
| （なし） | `.github/`（Issue/PR テンプレート、CI、Dependabot）、`CONTRIBUTING.md`、`LICENSE`、`CODE_OF_CONDUCT.md`、`SECURITY.md`、`DESIGN.md` | 統一開発フローの雛形として新規追加 |
| `README.md` / `CHANGELOG.md` | 同左 | 標準形式（メタ表・表形式・判断記録）で書き直し。プレゼンス記述は実態に合わせて修正（判断記録5） |

## 判断記録

1. **棚卸しの正は本番スナップショット（台3稼働コード、v1.2.2）とした。** GitHub 側の状態ではなく本番が正という方針に従い、コマンド・配点・データ形式はすべて稼働コードから読み取って再現した。
2. **言語は JavaScript（CommonJS）のまま変えなかった。** 旧実装が JS であり、スナップショットの実構成に従うことが条件のため。TypeScript 化は行わない。
3. **バージョンは 1.0.0 に振り直した。** 再作成に伴う全リポジトリ共通の方針。旧最終版は v1.2.2（2026-11-25）。
4. **pm2 アプリ名 `suzushiro` と DB ファイル名 `games.db` は据え置いた。** 運用互換（監視・デプロイ手順・既存データ）のため。データ保存先の環境変数（`SUZUSHIRO_DATA_DIR`、旧互換 `MABUSABA_DATA_DIR`）も同一。
5. **README のプレゼンス記述を実装実態に合わせて修正した。** 旧 README には Watching「/help | {ping}ms」（5分間隔）と書かれていたが、稼働コードは既に全 Bot 共通のプレゼンス・サイクル（Playing、1分交互、境界200ms前先行送信）に移行済みだった。新 README はコードの実態を正とした。
6. **`.env.example` を新規に作成した。** 旧 README は `.env.example` の存在を前提に書かれていたが、実ファイルが存在しなかったため、コードから読み取れる環境変数をすべて列挙して作成した。
7. **テストは旧検証スクリプトの範囲を再現し、項目を追加した。** 旧スクリプトが検証していた DB 移行・チャンネル制限・コマンド定義・実行ログ形式・ゲームデータの流れに加え、起動時バックアップ（子プロセスで分離検証）、ポイント表、ゲームロジック（ブラックジャックの手札計算、ルーレットの色対応など）、プレゼンス整形を追加した。Discord への実接続は検証対象外（従来どおり）。
8. **CI はビルド工程のない JavaScript プロジェクト向けに適応した。** `npm ci` → 構文チェック（`npm run check`）→ テスト（`npm test`）→ `npm audit`（非ブロッキング）の構成とし、Markdown とドキュメントのみの変更では走らないよう paths-ignore を付けた。
9. **コメント規約を全面適用した。** バナー見出し＋絵文字マーカーで統一し、旧コードにあった意図コメント（コイントスを引き分け扱いにする理由、スレッドの親チャンネル判定など）は意味を保って引き継いだ。
10. **`startExtendedGame`（スラッシュ側から拡張ゲームを直接始める入口）は互換のため保持した。** 旧実装でも定義のみで未使用だった関数だが、削除による差分を避けるため同じ形で残している。拡張ゲームの実際の開始経路はメニューボタン（`startExtendedGameFromButton`）である。
11. **内部定数名などの非公開な命名は再実装時に整理した。** コンテンツモジュールの内部配列名などを分かりやすい名前に変えたが、外部から観測できる文言・確率・配点・表示形式はすべて同一に保っている。
