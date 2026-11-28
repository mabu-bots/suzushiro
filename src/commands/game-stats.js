// ==========================================
// 📊 ゲーム統計表示
// ==========================================

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getGameStats, getGlobalStats } = require('../utils/gameData');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('game-stats')
    .setDescription('ミニゲームの統計情報を表示します')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  // 📊 ミニゲームの統計情報を表示する（管理権限のみ）
  async execute(interaction) {
    // 🛡️ サーバー管理権限がない場合は拒否する（定義側の既定権限に加えて実行時にも確認）
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: '❌ このコマンドはサーバー管理権限が必要です。',
        ephemeral: true,
      });
    }

    const global = getGlobalStats();
    const stats = getGameStats();

    const embed = new EmbedBuilder()
      .setTitle('📊 水無瀬組ゲーム統計')
      .addFields({
        name: '🌐 全体',
        value:
          `ゲーム数: **${global.games}**\n` +
          `参加人数: **${global.users}**\n` +
          `総ポイント変動: **${formatPoints(global.points)}**`,
      })
      .setColor(0x5865f2)
      .setTimestamp();

    if (stats.length > 0) {
      embed.addFields({
        name: '🎮 ゲーム別',
        value: stats
          .map(
            (stat) =>
              `**${getGameName(stat.game)}**\n` +
              `プレイ: ${stat.games}回 / ` +
              `勝利: ${stat.wins}回 / ` +
              `敗北: ${stat.losses}回 / ` +
              `ポイント: ${formatPoints(stat.points)}`,
          )
          .join('\n\n'),
      });
    } else {
      embed.addFields({
        name: '🎮 ゲーム別',
        value: 'まだゲーム履歴がありません。',
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

// 🎮 ゲームの内部名を日本語表示名に変換する
function getGameName(game) {
  const names = {
    blackjack: '🃏 ブラックジャック',
    roulette: '🎯 ルーレット',
    quiz: '❓ クイズ',
    numberguess: '🔢 数字当て',
    dice: '🎲 サイコロ',
    coin: '🪙 コイントス',
    rps: '✊ じゃんけん',
    highlow: '🎯 HIGH & LOW',
    slots: '🎰 スロット',
  };
  return names[game] || game;
}

// 💰 ポイント変動量を符号付きで表示する
function formatPoints(points) {
  if (points > 0) return `+${points}pt`;
  return `${points}pt`;
}
