// ==========================================
// 🎯 HIGH & LOW
// ==========================================

// 🃏 1〜13のカードを1枚引く
function drawCard() {
  return Math.floor(Math.random() * 13) + 1;
}

// 🎯 HIGH & LOWを1回遊ぶ。
// 最初のカードと次のカードを引き、予想（high / low）が当たれば勝ち。
// 同じ数字は予想にかかわらず引き分け。
function playHighLow(choice) {
  const first = drawCard();
  const second = drawCard();

  let result;
  if (first === second) {
    result = 'draw';
  } else if (choice === 'high' && second > first) {
    result = 'win';
  } else if (choice === 'low' && second < first) {
    result = 'win';
  } else {
    result = 'lose';
  }

  return { first, second, result };
}

module.exports = { playHighLow };
