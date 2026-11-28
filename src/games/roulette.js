// ==========================================
// 🎡 ルーレット
// ==========================================

// 🎯 赤の出目一覧（0は緑、それ以外は黒）
const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

// 🎡 ルーレットを1回回す（0〜36の出目と色を返す）
function spin() {
  const number = Math.floor(Math.random() * 37);
  return { number, color: number === 0 ? 'green' : RED.has(number) ? 'red' : 'black' };
}

module.exports = { spin };
