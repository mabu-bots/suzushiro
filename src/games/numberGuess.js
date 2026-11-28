// ==========================================
// 🔢 数字当て
// ==========================================

// 🔢 1〜6の答えを決めて数字当てを開始する（tries は挑戦回数の初期値）
function start() {
  return { answer: Math.floor(Math.random() * 6) + 1, tries: 0 };
}

module.exports = { start };
