// ==========================================
// 🎰 スロット
// ==========================================

// ===== 1. リール =====
// 🎰 リールの絵柄一覧
const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '🔔', '⭐', '7️⃣'];

// 🎰 リールを3つ回す
function spin() {
  const reel = () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  return [reel(), reel(), reel()];
}

// ===== 2. 判定 =====
// 🎰 スロットを1回回して結果を判定する。
// 3つ揃いはジャックポット（+50）、2つ揃いは当たり（+15）、それ以外はハズレ。
// points は表示用の目安で、実際の付与はポイント表（gamePoints）側が決める。
function playSlots() {
  const result = spin();

  let points = 0;
  let outcome = 'lose';

  if (result[0] === result[1] && result[1] === result[2]) {
    points = 50;
    outcome = 'jackpot';
  } else if (result[0] === result[1] || result[1] === result[2] || result[0] === result[2]) {
    points = 15;
    outcome = 'win';
  }

  return { result, points, outcome };
}

module.exports = { playSlots };
