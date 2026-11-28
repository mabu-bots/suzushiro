// ==========================================
// 📝 コマンド実行ログ
// ==========================================

'use strict';

// ===== 1. 整形 =====
// 📝 コマンド実行ログを標準出力へ1行で出すための整形ユーティリティ。
// 記録するのはコマンド名・ID類・成否のみで、ユーザーの入力テキストは含めない。
// 形式: [exec] <ISO時刻> cmd=<名前> route=<slash|prefix> guild=<ID> channel=<ID> user=<ID> result=<ok|error>
// ID が欠けている項目は「-」で埋める。失敗時は末尾に error="<要点>"
// （先頭行のみ、二重引用符は単引用符に置換、120文字まで）を付ける。
function formatExecLog({ cmd, route, guild, channel, user, result, error, now = new Date() }) {
  const id = (value) =>
    value === null || value === undefined || value === '' ? '-' : String(value);
  let line = `[exec] ${now.toISOString()} cmd=${cmd} route=${route} guild=${id(guild)} channel=${id(channel)} user=${id(user)} result=${result}`;
  if (result === 'error') {
    const message = error instanceof Error ? error.message : String(error ?? '');
    const summary = message.split('\n')[0].replace(/"/g, "'").slice(0, 120);
    line += ` error="${summary}"`;
  }
  return line;
}

// ===== 2. 出力 =====
// 📝 コマンド実行ログを1行で標準出力に出す。
function logExec(entry) {
  console.log(formatExecLog(entry));
}

module.exports = { formatExecLog, logExec };
