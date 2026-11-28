// ==========================================
// 🧪 統合検証スクリプト（npm test）
// ==========================================
// Discord へは接続せず、一時ディレクトリの DB を使って
// 移行・チャンネル制限・コマンド定義・実行ログ・ゲームデータ・
// ポイント表・ゲームロジック・プレゼンス整形を検証する。
// 運用中のゲーム DB には一切触れない。

'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// ===== 1. DB移行 =====
// 環境変数はモジュール読み込み前に設定する（保存先は読み込み時に決まる）
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'suzushiro-game-verify-'));
process.env.SUZUSHIRO_DATA_DIR = dataDir;
process.env.DB_BACKUP_ON_START = 'false';

const { migrateDatabase } = require('../src/utils/database');
const report = migrateDatabase();
assert.equal(report.afterChecks[0].ok, true, 'ゲームDBが整合性を保って初期化されること');
assert.ok(fs.existsSync(path.join(dataDir, 'games.db')), 'ゲームDBが作成されること');

// ===== 2. 起動時バックアップ（子プロセスで分離して検証） =====
const backupDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'suzushiro-backup-verify-'));
const childScript = `
  const { migrateDatabase } = require(${JSON.stringify(
    path.join(__dirname, '..', 'src', 'utils', 'database.js'),
  )});
  migrateDatabase();
  migrateDatabase();
`;
execFileSync(process.execPath, ['-e', childScript], {
  env: { ...process.env, SUZUSHIRO_DATA_DIR: backupDataDir, DB_BACKUP_ON_START: 'true' },
  stdio: 'pipe',
});
const backupRoot = path.join(backupDataDir, 'backups');
assert.ok(fs.existsSync(backupRoot), '2回目の起動でバックアップが作られること');
assert.ok(fs.readdirSync(backupRoot).length >= 1, 'バックアップ世代が1つ以上残ること');

// ===== 3. チャンネル制限 =====
const {
  commandKey,
  parseChannelIds,
  getAllowedChannelIds,
  isCommandAllowedInChannel,
  buildChannelRestrictionMessage,
} = require('../src/utils/channelPolicy');
const policyEnv = {
  DEFAULT_COMMAND_CHANNELS: '111111111111111111, 222222222222222222',
  COMMAND_CHANNELS_GAME: '333333333333333333',
  COMMAND_CHANNELS_GAME_LOGS: '444444444444444444 555555555555555555',
};
assert.equal(commandKey('game-logs'), 'COMMAND_CHANNELS_GAME_LOGS');
assert.deepEqual(parseChannelIds('123, abc 123'), [], '17〜20桁の数字以外は捨てること');
assert.deepEqual(getAllowedChannelIds('game', policyEnv), ['333333333333333333']);
assert.deepEqual(getAllowedChannelIds('ranking', policyEnv), [
  '111111111111111111',
  '222222222222222222',
]);
assert.equal(isCommandAllowedInChannel('game', '333333333333333333', null, policyEnv), true);
assert.equal(isCommandAllowedInChannel('game', '111111111111111111', null, policyEnv), false);
assert.equal(isCommandAllowedInChannel('ranking', '222222222222222222', null, policyEnv), true);
assert.equal(isCommandAllowedInChannel('profile', '333333333333333333', null, {}), true);
// スレッド内実行時：チャンネル自体のIDは許可リストに無いが、親チャンネルIDが許可されていればOK
assert.equal(
  isCommandAllowedInChannel('game', '999999999999999999', '333333333333333333', policyEnv),
  true,
);
assert.equal(
  isCommandAllowedInChannel('game', '999999999999999999', '111111111111111111', policyEnv),
  false,
);
assert.match(buildChannelRestrictionMessage('game-logs', policyEnv), /<#444444444444444444>/);

// ===== 4. コマンド定義 =====
const commandModules = [
  require('../src/commands/game'),
  require('../src/commands/game-logs'),
  require('../src/commands/game-points'),
  require('../src/commands/game-stats'),
  require('../src/commands/profile'),
  require('../src/commands/ranking'),
];
const commandNames = commandModules.map((command) => command.data.name).sort();
assert.deepEqual(commandNames, [
  'game',
  'game-logs',
  'game-points',
  'game-stats',
  'profile',
  'ranking',
]);
assert.ok(
  commandModules.every((command) => typeof command.execute === 'function'),
  'すべてのゲームコマンドが実行関数を持つこと',
);
const gameCommand = commandModules[0];
assert.equal(
  typeof gameCommand.handleButton,
  'function',
  '/game が拡張ゲーム用のボタン処理を持つこと',
);

// ===== 5. 実行ログ =====
const { formatExecLog } = require('../src/utils/execLog');
const fixedNow = new Date('2026-11-23T00:00:00.000Z');
assert.equal(
  formatExecLog({
    cmd: 'omikuji',
    route: 'prefix',
    guild: 'g1',
    channel: 'c1',
    user: 'u1',
    result: 'ok',
    now: fixedNow,
  }),
  '[exec] 2026-11-23T00:00:00.000Z cmd=omikuji route=prefix guild=g1 channel=c1 user=u1 result=ok',
  '実行ログ（成功時）の形式が仕様どおりであること',
);
assert.equal(
  formatExecLog({
    cmd: 'game',
    route: 'slash',
    guild: null,
    channel: 'c1',
    user: 'u1',
    result: 'error',
    error: new Error('失敗しました\n詳細は2行目'),
    now: fixedNow,
  }),
  '[exec] 2026-11-23T00:00:00.000Z cmd=game route=slash guild=- channel=c1 user=u1 result=error error="失敗しました"',
  '実行ログ（失敗時）は guild 欠落を - にし、エラーの先頭行だけを付けること',
);

// ===== 6. ポイント表 =====
const { getGamePoints, isValidGame, isValidResult } = require('../src/utils/gamePoints');
assert.equal(getGamePoints('slots', 'jackpot'), 50);
assert.equal(getGamePoints('blackjack', 'draw'), 5);
assert.equal(getGamePoints('coin', 'draw'), 0);
assert.throws(() => getGamePoints('unknown', 'win'), /Unknown game/);
assert.throws(() => getGamePoints('roulette', 'draw'), /Unknown result/);
assert.equal(isValidGame('quiz'), true);
assert.equal(isValidResult('roulette', 'draw'), false);

// ===== 7. ゲームロジック =====
const { playDice } = require('../src/games/dice');
for (let i = 0; i < 50; i++) {
  const dice = playDice();
  assert.ok(dice.player >= 1 && dice.player <= 6 && dice.bot >= 1 && dice.bot <= 6);
  const expected = dice.player > dice.bot ? 'win' : dice.player < dice.bot ? 'lose' : 'draw';
  assert.equal(dice.result, expected);
}

const { handTotal } = require('../src/games/blackjack');
assert.equal(handTotal([11, 6]), 17, 'エースは通常11として数えること');
assert.equal(handTotal([11, 11, 9]), 21, 'バーストする場合はエースを1として数え直すこと');
assert.equal(handTotal([5, 6, 11]), 12);

const { spin: rouletteSpin } = require('../src/games/roulette');
const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
for (let i = 0; i < 100; i++) {
  const spin = rouletteSpin();
  assert.ok(spin.number >= 0 && spin.number <= 36);
  const expectedColor = spin.number === 0 ? 'green' : RED.has(spin.number) ? 'red' : 'black';
  assert.equal(spin.color, expectedColor);
}

const { random: quizRandom } = require('../src/games/quiz');
const question = quizRandom();
assert.ok(question.a[question.correct] !== undefined, 'クイズの正解番号が選択肢の範囲内であること');

const { start: numberGuessStart } = require('../src/games/numberGuess');
const guess = numberGuessStart();
assert.ok(guess.answer >= 1 && guess.answer <= 6 && guess.tries === 0);

const { playSlots } = require('../src/games/slots');
for (let i = 0; i < 100; i++) {
  const slots = playSlots();
  assert.equal(slots.result.length, 3);
  if (slots.outcome === 'jackpot') {
    assert.ok(slots.result[0] === slots.result[1] && slots.result[1] === slots.result[2]);
    assert.equal(slots.points, 50);
  }
}

// ===== 8. プレゼンス・サイクル =====
const {
  formatElapsedMinutes,
  presenceCycleText,
  nextPresenceSend,
} = require('../src/presence-cycle');
assert.equal(formatElapsedMinutes(0), '0分');
assert.equal(formatElapsedMinutes(26 * 60000), '26分');
assert.equal(formatElapsedMinutes(86 * 60000), '1時間26分');
// Unix 分が偶数の分は経過時間、奇数の分は現在時刻（JST）
const evenMinute = new Date('2026-11-28T00:00:00.000Z'); // 1764112800分 = 偶数
assert.equal(
  presenceCycleText('水無瀬組', evenMinute.getTime(), evenMinute),
  '水無瀬組 | 起動して 0分',
);
const oddMinute = new Date(evenMinute.getTime() + 60000);
assert.equal(
  presenceCycleText('水無瀬組', evenMinute.getTime(), oddMinute),
  '水無瀬組 | 現在時刻 09:01 JST',
);
// 送信予定が過ぎている場合は翌分の境界へ前進する
const schedule = nextPresenceSend(evenMinute.getTime() + 59950);
assert.equal(schedule.boundary, evenMinute.getTime() + 120000);
assert.equal(schedule.sendAt, schedule.boundary - 200);

// ===== 9. ゲームデータ =====
const { getUser, recordGame, getGameLogs, getRanking, closeDatabase } = require('../src/utils/gameData');

assert.equal(getUser('player-1', 'Player One').points, 100);
assert.equal(
  recordGame({ userId: 'player-1', username: 'Player One', game: 'dice', result: 'lose', points: -95 })
    .points,
  5,
);
assert.equal(
  recordGame({ userId: 'player-1', username: 'Player One', game: 'dice', result: 'lose', points: -5 })
    .points,
  0,
);
assert.throws(
  () =>
    recordGame({ userId: 'player-1', username: 'Player One', game: 'dice', result: 'lose', points: -5 }),
  /ポイントが不足/,
  '負残高となるゲーム結果を拒否すること',
);
assert.equal(getGameLogs({ userId: 'player-1', limit: 999 }).length, 2);
assert.equal(getRanking(999).length, 1);
closeDatabase();

console.log('✅ Game commands and game database integration verified');
