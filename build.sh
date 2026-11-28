#!/usr/bin/env bash
# ==========================================
# 🔨 suzushiro ワンコマンドビルド
# ==========================================
# 依存関係のインストール → 構文チェック → テスト を順に実行し、
# 失敗したステップで即座に止まって、どのステップで落ちたかを表示する。
# suzushiro は TypeScript を使わないため、コンパイルはなくソースを直接実行する。

# ===== 1. 準備 =====
set -euo pipefail
cd "$(dirname "$0")"

step() {
  echo
  echo "===== $1 ====="
}

fail() {
  echo "ERROR: ステップが失敗しました: $1" >&2
  exit 1
}

command -v node >/dev/null 2>&1 || fail "前提チェック (Node.js が見つかりません)"
command -v npm >/dev/null 2>&1 || fail "前提チェック (npm が見つかりません)"

# ===== 2. 依存関係のインストール =====
step "1/3 依存関係のインストール"
if [ -f package-lock.json ]; then
  npm ci --no-audit --no-fund || fail "依存関係のインストール (npm ci)"
else
  npm install --no-audit --no-fund || fail "依存関係のインストール (npm install)"
fi

# ===== 3. 構文チェック =====
step "2/3 構文チェック (npm run check)"
npm run check || fail "構文チェック (npm run check)"

# ===== 4. テスト =====
step "3/3 テスト (npm test)"
npm test || fail "テスト (npm test)"

# ===== 5. 完了 =====
echo
echo "BUILD OK: suzushiro のチェックとテストがすべて成功しました (ソースを直接実行します。起動: npm start)"
