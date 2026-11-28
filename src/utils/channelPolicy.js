// ==========================================
// 🔒 コマンド実行チャンネル制限
// ==========================================

'use strict';

// ===== 1. 環境変数名の決定 =====
// 🔑 コマンド名から許可チャンネル設定の環境変数名を作る。
// 例: game-logs → COMMAND_CHANNELS_GAME_LOGS
function commandKey(commandName) {
  return `COMMAND_CHANNELS_${String(commandName || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')}`;
}

// ===== 2. 値のパース =====
// 🔢 環境変数の文字列をチャンネルIDの配列に変換する。
// カンマ／空白区切りで、17〜20桁の数字だけを通し、重複を取り除く。
function parseChannelIds(value) {
  if (typeof value !== 'string') return [];
  return [
    ...new Set(
      value
        .split(/[\s,]+/)
        .map((channelId) => channelId.trim())
        .filter((channelId) => /^\d{17,20}$/.test(channelId)),
    ),
  ];
}

// ===== 3. 許可リストの解決 =====
// 🔒 コマンドの許可チャンネル一覧を取得する。
// 個別設定（COMMAND_CHANNELS_*）があればそれを使い、なければ既定設定
// （DEFAULT_COMMAND_CHANNELS）に落とす。どちらも未設定なら null（制限なし）。
// 空文字だけの設定は「未設定」として扱う。
function getAllowedChannelIds(commandName, env = process.env) {
  const specificValue = env[commandKey(commandName)];
  if (specificValue !== undefined && specificValue.trim() !== '') {
    return parseChannelIds(specificValue);
  }

  const defaultValue = env.DEFAULT_COMMAND_CHANNELS;
  if (defaultValue !== undefined && defaultValue.trim() !== '') {
    return parseChannelIds(defaultValue);
  }

  return null;
}

// ===== 4. 実行可否の判定 =====
// 🔒 コマンドをこのチャンネルで実行できるか判定する。
// parentId は、実行場所がスレッドの場合にその親チャンネルのIDを渡す。
// 許可リストに「チャンネル自体のID」または「親チャンネルのID」のどちらかが
// 含まれていれば許可する（＝親チャンネルを許可しておけば、そこから作られる
// スレッドは新規作成分も含めてすべて許可される）。
function isCommandAllowedInChannel(commandName, channelId, parentId = null, env = process.env) {
  const allowedChannelIds = getAllowedChannelIds(commandName, env);
  if (allowedChannelIds === null) return true;
  if (allowedChannelIds.includes(String(channelId || ''))) return true;
  if (parentId && allowedChannelIds.includes(String(parentId))) return true;
  return false;
}

// ===== 5. 案内文 =====
// 💬 チャンネル制限に引っかかったときの案内文を作る。
// 許可チャンネルが1件も解釈できない場合は、設定確認を促す汎用文にする。
function buildChannelRestrictionMessage(commandName, env = process.env) {
  const allowedChannelIds = getAllowedChannelIds(commandName, env);
  if (!allowedChannelIds?.length) {
    return '❌ このコマンドは、このチャンネルでは実行できません。管理者に許可チャンネルの設定を確認してください。';
  }

  const channelMentions = allowedChannelIds.map((channelId) => `<#${channelId}>`).join(', ');
  return `❌ \`/${commandName}\` は ${channelMentions} でのみ実行できます。`;
}

module.exports = {
  commandKey,
  parseChannelIds,
  getAllowedChannelIds,
  isCommandAllowedInChannel,
  buildChannelRestrictionMessage,
};
