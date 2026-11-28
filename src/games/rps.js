// ==========================================
// ✊ じゃんけん
// ==========================================

// ===== 1. 手の定義 =====
// ✊ 手の選択肢一覧
const CHOICES = ['rock', 'paper', 'scissors'];

// ✊ 手の内部名を日本語表示名に変換する
function getName(choice) {
  const names = {
    rock: '✊ グー',
    paper: '✋ パー',
    scissors: '✌️ チョキ',
  };
  return names[choice];
}

// ===== 2. 対戦 =====
// ✊ じゃんけんを1回遊ぶ（Botの手はランダム）
function playRps(player) {
  const bot = CHOICES[Math.floor(Math.random() * CHOICES.length)];

  let result;
  if (player === bot) {
    result = 'draw';
  } else if (
    (player === 'rock' && bot === 'scissors') ||
    (player === 'paper' && bot === 'rock') ||
    (player === 'scissors' && bot === 'paper')
  ) {
    result = 'win';
  } else {
    result = 'lose';
  }

  return {
    player,
    bot,
    result,
    playerName: getName(player),
    botName: getName(bot),
  };
}

module.exports = { playRps };
