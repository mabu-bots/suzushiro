// ==========================================
// 🏆 ゲームポイントランキング
// ==========================================

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getRanking } = require('../utils/gameData');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ranking')
    .setDescription('ゲームポイントランキングを表示します'),

  // 🏆 ゲームポイントランキングを表示する（上位10件）
  async execute(interaction) {
    const ranking = getRanking(10);

    if (ranking.length === 0) {
      return interaction.reply({
        content: '📊 まだランキングデータがありません。',
      });
    }

    // 🥇 1〜3位はメダル、4位以降は順位番号で表示する
    const medals = ['🥇', '🥈', '🥉'];
    const lines = ranking.map((user, i) => {
      const medal = medals[i] ?? `${i + 1}.`;
      return `${medal} **${user.username || user.user_id}** — ${user.points}pt`;
    });

    const embed = new EmbedBuilder()
      .setTitle('🏆 水無瀬組ゲームランキング')
      .setDescription(lines.join('\n'))
      .setColor(0xffd700)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
