// ==========================================
// 🃏 ブラックジャック
// ==========================================
// 手札は数値の配列で持ち、11 はエース相当として扱う
// （合計が21を超えたら1として数え直す）。

// 🎲 1〜11のカードを1枚引く
function draw() {
  return Math.floor(Math.random() * 11) + 1;
}

// 🃏 手札の合計を計算する（11のカードは合計が21を超えたら1として数え直す）
function handTotal(hand) {
  let total = hand.reduce((a, b) => a + b, 0);
  let aces = hand.filter((v) => v === 11).length;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

// 🃏 ゲームを開始する（プレイヤーとディーラーに2枚ずつ配る）
function start() {
  const player = [draw(), draw()];
  const dealer = [draw(), draw()];
  return { player, dealer, total: handTotal(player), dealerTotal: handTotal(dealer) };
}

// 🃏 カードを1枚引く（ヒット）。state を直接更新して返す
function hit(state) {
  state.player.push(draw());
  state.total = handTotal(state.player);
  return state;
}

// 🃏 ディーラーの手番（合計17未満の間は引き続ける）
function dealerPlay(state) {
  while (handTotal(state.dealer) < 17) state.dealer.push(draw());
  state.dealerTotal = handTotal(state.dealer);
  return state;
}

// 🏁 勝敗を判定する（プレイヤーのバーストは即負け、それ以外はディーラーを
// 17以上まで引かせてから合計の大小で決める）
function result(state) {
  if (state.total > 21) return 'lose';
  dealerPlay(state);
  if (state.dealerTotal > 21) return 'win';
  if (state.total > state.dealerTotal) return 'win';
  if (state.total < state.dealerTotal) return 'lose';
  return 'draw';
}

module.exports = { start, hit, dealerPlay, result, handTotal };
