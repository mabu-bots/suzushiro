@echo off
rem ==========================================
rem 🔨 suzushiro ワンコマンドビルド (Windows 用)
rem ==========================================
rem 依存関係のインストール → 構文チェック → テスト を順に実行し、
rem 失敗したステップで即座に止まって、どのステップで落ちたかを表示する。
rem suzushiro は TypeScript を使わないため、コンパイルはなくソースを直接実行する。
setlocal
chcp 65001 >nul
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm が見つかりません。Node.js 20 以上をインストールしてください。 1>&2
  exit /b 1
)

echo.
echo ===== 1/3 依存関係のインストール =====
if exist package-lock.json (
  call npm ci --no-audit --no-fund
) else (
  call npm install --no-audit --no-fund
)
if errorlevel 1 goto fail_install

echo.
echo ===== 2/3 構文チェック (npm run check) =====
call npm run check
if errorlevel 1 goto fail_check

echo.
echo ===== 3/3 テスト (npm test) =====
call npm test
if errorlevel 1 goto fail_test

echo.
echo BUILD OK: suzushiro のチェックとテストがすべて成功しました (ソースを直接実行します。起動: npm start)
exit /b 0

:fail_install
echo ERROR: ステップが失敗しました: 依存関係のインストール 1>&2
exit /b 1

:fail_check
echo ERROR: ステップが失敗しました: 構文チェック (npm run check) 1>&2
exit /b 1

:fail_test
echo ERROR: ステップが失敗しました: テスト (npm test) 1>&2
exit /b 1
