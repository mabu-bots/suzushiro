// ==========================================
// 💰 ゲームポイント表
// ==========================================

// ===== 1. ポイント表 =====
// 💰 ゲームごとのポイント表（勝ち・負け・引き分け・ジャックポットの変動量）。
// ここに無いゲーム／結果の組み合わせはエラーになる（呼び出し側のタイポ検出）。
const POINT_RULES = {
  blackjack: { win: 25, lose: -10, draw: 5 },
  roulette: { win: 20, lose: -10 },
  quiz: { win: 15, lose: -5 },
  numberguess: { win: 20, lose: -5 },
  dice: { win: 10, lose: -5, draw: 0 },
  coin: { win: 10, lose: -5, draw: 0 },
  rps: { win: 15, lose: -5, draw: 0 },
  highlow: { win: 20, lose: -5, draw: 0 },
  slots: { win: 15, lose: -5, draw: 0, jackpot: 50 },
};

// ===== 2. 参照 =====
// 💰 ゲーム結果のポイント変動量を取得する
function getGamePoints(game, result) {
  const rules = POINT_RULES[game];
  if (!rules) {
    throw new Error(`Unknown game: ${game}`);
  }
  if (!Object.prototype.hasOwnProperty.call(rules, result)) {
    throw new Error(`Unknown result "${result}" for game "${game}"`);
  }
  return rules[result];
}

// 💰 ゲームのポイント表を取得する（無ければ null）
function getGameRules(game) {
  return POINT_RULES[game] || null;
}

// 💰 全ゲームのポイント表を取得する（浅いコピー）
function getAllGameRules() {
  return { ...POINT_RULES };
}

// ===== 3. 検証 =====
// ✅ ゲームがポイント表に存在するか確認する
function isValidGame(game) {
  return Object.prototype.hasOwnProperty.call(POINT_RULES, game);
}

// ✅ ゲーム結果がポイント表に存在するか確認する
function isValidResult(game, result) {
  const rules = POINT_RULES[game];
  if (!rules) return false;
  return Object.prototype.hasOwnProperty.call(rules, result);
}

module.exports = {
  POINT_RULES,
  getGamePoints,
  getGameRules,
  getAllGameRules,
  isValidGame,
  isValidResult,
};
