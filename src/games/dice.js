// ==========================================
// 🎲 サイコロ
// ==========================================

// 🎲 サイコロを振って勝敗を決める（プレイヤーとBotが1〜6を1回ずつ振り、大きい方が勝ち）
function playDice() {
  const player = Math.floor(Math.random() * 6) + 1;
  const bot = Math.floor(Math.random() * 6) + 1;

  let result;
  if (player > bot) {
    result = 'win';
  } else if (player < bot) {
    result = 'lose';
  } else {
    result = 'draw';
  }

  return { player, bot, result };
}

module.exports = { playDice };
