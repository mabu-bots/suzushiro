// ==========================================
// 🎮 ゲーム進行管理
// ==========================================

const { recordGame } = require('./gameData');
const { getGamePoints } = require('./gamePoints');

// ===== 1. 拡張ゲームの終了処理 =====
// 🏁 拡張ゲーム（Blackjack / Roulette / Quiz / 数字当て）を終了し、
// ポイント表から変動量を引いて結果を記録する。
// 戻り値は { points, data }（data は記録後のユーザー行）。
async function finishGame({ interaction, game, result, metadata = null }) {
  const points = getGamePoints(game, result);
  const data = recordGame({
    userId: interaction.user.id,
    username: interaction.user.username,
    game,
    result,
    points,
    metadata,
  });
  return { points, data };
}

module.exports = { finishGame };
