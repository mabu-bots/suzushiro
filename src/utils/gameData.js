// ==========================================
// 🗄️ ゲームデータ（SQLite）
// ==========================================

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// ===== 1. 接続 =====
// 🗄️ データ保存先（環境変数 SUZUSHIRO_DATA_DIR / MABUSABA_DATA_DIR、未設定時は src/data）
// MABUSABA_DATA_DIR は旧名称との互換のため残している。
const dataDir = path.resolve(
  process.env.SUZUSHIRO_DATA_DIR ||
    process.env.MABUSABA_DATA_DIR ||
    path.join(__dirname, '../data'),
);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 🗄️ ゲーム用データベースを開く
const db = new Database(path.join(dataDir, 'games.db'));

db.pragma('journal_mode = WAL'); // 💾 WALモード
db.pragma('foreign_keys = ON'); // 🔗 外部キー制約を有効化
db.pragma('busy_timeout = 5000'); // ⏱️ ロック待機の上限5秒

// ===== 2. テーブル定義 =====
// 起動時移行（utils/database.js）が先に走る前提だが、単体で開かれても
// 使えるよう、ここでも同じ形で CREATE TABLE IF NOT EXISTS を用意する。
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    username TEXT NOT NULL DEFAULT '',
    points INTEGER NOT NULL DEFAULT 100,
    games INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS game_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL DEFAULT '',
    game TEXT NOT NULL,
    result TEXT NOT NULL,
    points_before INTEGER NOT NULL,
    points_change INTEGER NOT NULL,
    points_after INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    metadata TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_game_logs_user_id ON game_logs(user_id);
  CREATE INDEX IF NOT EXISTS idx_game_logs_game ON game_logs(game);
  CREATE INDEX IF NOT EXISTS idx_game_logs_result ON game_logs(result);
  CREATE INDEX IF NOT EXISTS idx_game_logs_created_at ON game_logs(created_at);
`);

// ===== 3. ユーザー =====
const getUserStmt = db.prepare('SELECT * FROM users WHERE user_id = ?');
const createUserStmt = db.prepare(
  'INSERT INTO users (user_id, username, points) VALUES (?, ?, 100)',
);
const updateUsernameStmt = db.prepare(
  'UPDATE users SET username = ?, updated_at = unixepoch() WHERE user_id = ?',
);

// 👤 ユーザーを取得する（未登録なら初期ポイント100で新規作成し、
// 名前が変わっていれば更新する）。
function ensureUser(userId, username = '') {
  let user = getUserStmt.get(userId);

  if (!user) {
    createUserStmt.run(userId, username);
    user = getUserStmt.get(userId);
  }

  if (username && user.username !== username) {
    updateUsernameStmt.run(username, userId);
    user = getUserStmt.get(userId);
  }

  return user;
}

// 👤 ユーザーを取得する
function getUser(userId, username = '') {
  return ensureUser(userId, username);
}

// ===== 4. ゲーム結果の記録 =====
// 🎮 ポイント更新とログ保存は必ず同一トランザクションで実行する。
// 残高が負数になる結果は例外で拒否し、トランザクションごと巻き戻す。
// result が win / jackpot なら勝利、lose なら敗北として数える。
const recordGameTransaction = db.transaction(({ userId, username, game, result, points, metadata }) => {
  const user = ensureUser(userId, username);
  const before = user.points;
  const after = before + points;

  if (after < 0) {
    throw new Error('ポイントが不足しているため、このゲームを実行できません。');
  }

  const wins = result === 'win' || result === 'jackpot' ? 1 : 0; // 🏆 jackpotは勝利扱い
  const losses = result === 'lose' ? 1 : 0;

  db.prepare(
    `UPDATE users
     SET points = ?, games = games + 1, wins = wins + ?, losses = losses + ?,
         updated_at = unixepoch()
     WHERE user_id = ?`,
  ).run(after, wins, losses, userId);

  db.prepare(
    `INSERT INTO game_logs (
       user_id, username, game, result,
       points_before, points_change, points_after, metadata
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    userId,
    username,
    game,
    result,
    before,
    points,
    after,
    metadata ? JSON.stringify(metadata) : null,
  );

  return getUser(userId, username);
});

// 🎮 ゲーム結果を記録する（入力検証つき）
function recordGame({ userId, username = '', game, result, points = 0, metadata = null }) {
  if (!game) throw new Error('game is required');
  if (!result) throw new Error('result is required');
  if (!Number.isInteger(points)) throw new Error('points must be an integer');
  return recordGameTransaction({ userId, username, game, result, points, metadata });
}

// ===== 5. 管理者によるポイント変更 =====
// 💰 変更と記録（game='system' / result='admin_adjustment'）を同一
// トランザクションで実行する。残高が負数になる変更は拒否する。
const adjustPointsTransaction = db.transaction(
  ({ userId, username, amount, reason, executorId, executorName }) => {
    const user = ensureUser(userId, username);
    const before = user.points;
    const after = before + amount;

    // 🛡️ ポイントがマイナスにならないようにする
    if (after < 0) {
      throw new Error('ポイントが0未満になるため変更できません');
    }

    db.prepare('UPDATE users SET points = ?, updated_at = unixepoch() WHERE user_id = ?').run(
      after,
      userId,
    );

    db.prepare(
      `INSERT INTO game_logs (
         user_id, username, game, result,
         points_before, points_change, points_after, metadata
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      userId,
      username,
      'system',
      'admin_adjustment',
      before,
      amount,
      after,
      JSON.stringify({ reason, executorId, executorName }),
    );

    return getUser(userId, username);
  },
);

// 💰 ポイントを変更する（入力検証つき）
function adjustPoints({
  userId,
  username = '',
  amount,
  reason = '管理者による変更',
  executorId,
  executorName,
}) {
  if (!Number.isInteger(amount)) throw new Error('amount must be an integer');
  return adjustPointsTransaction({ userId, username, amount, reason, executorId, executorName });
}

// ===== 6. 取得系 =====
// 🔢 取得件数を1〜100件に収める
function clampLimit(limit, fallback) {
  return Math.min(Math.max(Number(limit) || fallback, 1), 100);
}

// 🏆 ポイントランキングを取得する（ポイント降順、同点は勝利数→プレイ回数順）
function getRanking(limit = 10) {
  return db
    .prepare(
      `SELECT user_id, username, points, games, wins, losses
       FROM users
       ORDER BY points DESC, wins DESC, games ASC
       LIMIT ?`,
    )
    .all(clampLimit(limit, 10));
}

// 🔎 ゲームログを取得する（ユーザー・ゲーム・結果で絞り込み可、新しい順）
function getGameLogs({ userId = null, game = null, result = null, limit = 50 } = {}) {
  let sql = 'SELECT * FROM game_logs WHERE 1 = 1';
  const params = [];

  if (userId) {
    sql += ' AND user_id = ?';
    params.push(userId);
  }
  if (game) {
    sql += ' AND game = ?';
    params.push(game);
  }
  if (result) {
    sql += ' AND result = ?';
    params.push(result);
  }

  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(clampLimit(limit, 50));

  return db.prepare(sql).all(...params);
}

// 📊 ゲーム別統計を取得する（システム記録は除く）
function getGameStats() {
  return db
    .prepare(
      `SELECT
         game,
         COUNT(*) AS games,
         SUM(CASE WHEN result = 'win' OR result = 'jackpot' THEN 1 ELSE 0 END) AS wins,
         SUM(CASE WHEN result = 'lose' THEN 1 ELSE 0 END) AS losses,
         SUM(CASE WHEN result = 'draw' THEN 1 ELSE 0 END) AS draws,
         COALESCE(SUM(points_change), 0) AS points
       FROM game_logs
       WHERE game != 'system'
       GROUP BY game
       ORDER BY games DESC`,
    )
    .all();
}

// 🌐 全体統計を取得する（システム記録は除く）
function getGlobalStats() {
  return db
    .prepare(
      `SELECT
         COUNT(*) AS games,
         COUNT(DISTINCT user_id) AS users,
         COALESCE(SUM(points_change), 0) AS points,
         COALESCE(SUM(CASE WHEN points_change > 0 THEN points_change ELSE 0 END), 0) AS points_gained,
         COALESCE(SUM(CASE WHEN points_change < 0 THEN ABS(points_change) ELSE 0 END), 0) AS points_lost
       FROM game_logs
       WHERE game != 'system'`,
    )
    .get();
}

// 🕐 最近のゲームログを取得する
function getRecentLogs(limit = 20) {
  return db
    .prepare('SELECT * FROM game_logs ORDER BY created_at DESC LIMIT ?')
    .all(clampLimit(limit, 20));
}

// 💰 ユーザーのポイント変動合計を取得する（システム記録は除く）
function getUserPointStats(userId) {
  return db
    .prepare(
      `SELECT
         COUNT(*) AS games,
         COALESCE(SUM(points_change), 0) AS total_change,
         COALESCE(SUM(CASE WHEN points_change > 0 THEN points_change ELSE 0 END), 0) AS gained,
         COALESCE(SUM(CASE WHEN points_change < 0 THEN ABS(points_change) ELSE 0 END), 0) AS lost
       FROM game_logs
       WHERE user_id = ? AND game != 'system'`,
    )
    .get(userId);
}

// ===== 7. 終了 =====
// 🗄️ データベース接続を閉じる
function closeDatabase() {
  if (db.open) db.close();
}

module.exports = {
  getUser,
  recordGame,
  adjustPoints,
  getRanking,
  getGameLogs,
  getGameStats,
  getGlobalStats,
  getRecentLogs,
  getUserPointStats,
  closeDatabase,
};
