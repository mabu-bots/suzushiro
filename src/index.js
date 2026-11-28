// ==========================================
// 🎮 suzushiro メインエントリ
// ==========================================

require('dotenv').config();

// ===== 1. 起動前チェックとDB初期化 =====
// 🔑 DISCORD_TOKEN が未設定なら起動しない
if (!process.env.DISCORD_TOKEN) {
console.error('❌ DISCORD_TOKEN が環境変数に設定されていません。');
process.exit(1);
}

// 🗄️ ゲーム用データベースを初期化する（失敗したら起動しない）
const { migrateDatabase} = require('./utils/database');
try {
migrateDatabase();
} catch (error) {
console.error('❌ ゲーム用データベースの初期化に失敗しました:', error.message);
process.exit(1);
}

// ===== 2. 依存モジュール =====
const {
Client,
GatewayIntentBits,
REST,
Routes,
SlashCommandBuilder,
EmbedBuilder,
MessageFlags,
} = require('discord.js');
const { drawOmikuji} = require('./omikuji');
const { getRandomMessage} = require('./random');
const { getTodayContent} = require('./today');
const {
isCommandAllowedInChannel,
buildChannelRestrictionMessage,
} = require('./utils/channelPolicy');
const { logExec} = require('./utils/execLog');
const { startPresenceCycle} = require('./presence-cycle');

const gameCommands = [
require('./commands/game'),
require('./commands/game-logs'),
require('./commands/game-points'),
require('./commands/game-stats'),
require('./commands/profile'),
require('./commands/ranking'),
];

const gameCommandMap = new Map(gameCommands.map((command) => [command.data.name, command]));

// ===== 3. Discordクライアント =====
// テキストコマンドのために Message Content Intent が必要
// （Developer Portal 側でも有効化すること）。
const client = new Client({
intents: [
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.MessageContent,
],
});

// ===== 4. 返信コンテンツの生成 =====
// 🔮 おみくじ結果のEmbedを作る
function createOmikujiEmbed(user) {
const fortune = drawOmikuji();

return new EmbedBuilder()
.setTitle(`🔮 ${user.username} さんの運勢`)
.setAuthor({ name: fortune.result})
.setColor(fortune.color)
.setDescription(`****\n${fortune.description}`)
.addFields(fortune.fields)
.setTimestamp();
}

// 🎲 今日のひとことガチャのメッセージを作る
function createRandomMessage() {
const result = getRandomMessage();
return `🎲 **今日のひとことガチャ**\n\n${result.type}\n> ${result.text}`;
}

// 🌞 今日の○○のメッセージを作る
function createTodayMessage() {
const result = getTodayContent();
return `🌞 **今日の○○**\n\n${result.type}\n> ${result.text}`;
}

// ❌ インタラクションへのエラー応答を送る（返信済みならフォローアップで送る）
async function replyWithInteractionError(interaction, content) {
try {
if (interaction.replied || interaction.deferred) {
await interaction.followUp({ content, flags: MessageFlags.Ephemeral});
return;
}
await interaction.reply({ content, flags: MessageFlags.Ephemeral});
} catch (error) {
console.error('❌ エラー応答の送信に失敗しました:', error);
}
}

// ===== 5. 起動時の処理 =====
// 🚀 プレゼンス設定とスラッシュコマンド登録（グローバル、全置換）
client.once('ready', async () => {
console.log(`${client.user.tag} がオンラインになりました！`);

// 📺 プレゼンスは全 Bot 共通のサイクル（presence-cycle）が担う
startPresenceCycle(client);

const commands = [
new SlashCommandBuilder().setName('omikuji').setDescription('今日のおみくじを引きます'),
new SlashCommandBuilder().setName('random').setDescription('今日のひとことガチャを引きます'),
new SlashCommandBuilder().setName('today').setDescription('今日の○○を占います'),
...gameCommands.map((command) => command.data),
].map((command) => command.toJSON());

const rest = new REST({ version: '10'}).setToken(process.env.DISCORD_TOKEN);

try {
await rest.put(Routes.applicationCommands(client.user.id), { body: commands});
console.log(`スラッシュコマンドの登録が完了しました（${commands.length}件）。`);
} catch (error) {
console.error('スラッシュコマンドの登録に失敗しました:', error);
}
});

// ===== 6. スラッシュコマンド・ボタン処理 =====
// 🧵 実行場所がスレッドの場合、その親チャンネルのIDを返す（スレッドでなければ null）
function getThreadParentId(channel) {
return channel?.isThread?.()? channel.parentId: null;
}

client.on('interactionCreate', async (interaction) => {
if (interaction.isChatInputCommand()) {
const execBase = {
cmd: interaction.commandName,
route: 'slash',
guild: interaction.guildId,
channel: interaction.channelId,
user: interaction.user.id,
};
// 🔒 チャンネル制限に引っかかったら、案内だけ出して実行しない
if (
!isCommandAllowedInChannel(
interaction.commandName,
interaction.channelId,
getThreadParentId(interaction.channel),
)
) {
await replyWithInteractionError(
interaction,
buildChannelRestrictionMessage(interaction.commandName),
);
logExec({...execBase, result: 'ok'});
return;
}

try {
if (interaction.commandName === 'omikuji') {
await interaction.reply({ embeds: [createOmikujiEmbed(interaction.user)]});
} else if (interaction.commandName === 'random') {
await interaction.reply(createRandomMessage());
} else if (interaction.commandName === 'today') {
await interaction.reply(createTodayMessage());
} else {
const gameCommand = gameCommandMap.get(interaction.commandName);
if (gameCommand) {
await gameCommand.execute(interaction, client);
}
}
logExec({...execBase, result: 'ok'});
} catch (error) {
console.error(`❌ コマンド「${interaction.commandName}」の実行に失敗しました:`, error);
logExec({...execBase, result: 'error', error});
await replyWithInteractionError(interaction, '❌ コマンドの実行中にエラーが発生しました。');
}
return;
}

if (interaction.isButton()) {
// 🔒 ボタン操作もコマンドと同じチャンネル制限の対象にする。
// ボタンはゲーム系コマンドのものだけなので、'game' の許可設定で判定する。
if (
!isCommandAllowedInChannel(
'game',
interaction.channelId,
getThreadParentId(interaction.channel),
)
) {
await replyWithInteractionError(interaction, buildChannelRestrictionMessage('game'));
return;
}

for (const gameCommand of gameCommands) {
if (typeof gameCommand.handleButton!== 'function') continue;
try {
if (await gameCommand.handleButton(interaction, client)) return;
} catch (error) {
console.error('❌ ゲームボタンの処理に失敗しました:', error);
await replyWithInteractionError(interaction, '❌ ゲーム処理中にエラーが発生しました。');
return;
}
}
}
});

// ===== 7. テキスト（プレフィックス）コマンド =====
// 💬 プレフィックスコマンドへの返信。返信の失敗（権限不足など）が
// 未処理の Promise rejection になってプロセスを落とさないよう、必ず catch する。
// 戻り値は失敗時のエラー（成功時は null）で、実行ログの成否判定に使う。
async function replyToMessage(message, content) {
try {
await message.reply(content);
return null;
} catch (error) {
console.error('❌ メッセージへの返信に失敗しました:', error);
return error;
}
}

// ⌨️ プレフィックスコマンド一覧（入力テキスト → コマンド名）。完全一致のみ反応する
const PREFIX_COMMANDS = new Map([
['!omikuji', 'omikuji'],
['おみくじ', 'omikuji'],
['random', 'random'],
['ランダム', 'random'],
['today', 'today'],
['今日', 'today'],
]);

// 💬 プレフィックスコマンド受信時の処理
client.on('messageCreate', async (message) => {
if (message.author.bot) return;

const commandName = PREFIX_COMMANDS.get(message.content);
if (!commandName) return;

const execBase = {
cmd: commandName,
route: 'prefix',
guild: message.guildId,
channel: message.channelId,
user: message.author.id,
};
// 🔒 テキストコマンドは、許可チャンネル以外ではエラー文も出さず完全に無視する
if (
!isCommandAllowedInChannel(commandName, message.channelId, getThreadParentId(message.channel))
) {
return;
}

try {
let content;
if (commandName === 'omikuji') {
content = { embeds: [createOmikujiEmbed(message.author)]};
} else if (commandName === 'random') {
content = createRandomMessage();
} else {
content = createTodayMessage();
}
const replyError = await replyToMessage(message, content);
logExec(
replyError
? {...execBase, result: 'error', error: replyError}
: {...execBase, result: 'ok'},
);
} catch (error) {
console.error(`❌ コマンド「${commandName}」の実行に失敗しました:`, error);
logExec({...execBase, result: 'error', error});
}
});

// ===== 8. エラーハンドリングとログイン =====
client.on('error', (error) => {
console.error('Discord Client Error:', error);
});

// 🛡️ イベントハンドラ内の reject がプロセス全体を落とさないよう受け止め、
// 失敗が見えるようにログだけは残す（logbot と同方式）。
process.on('unhandledRejection', (reason) => {
console.error('unhandled rejection', reason);
});

// 🔑 Discordにログインする
client.login(process.env.DISCORD_TOKEN).catch((error) => {
console.error('❌ Discordへのログインに失敗しました:', error);
process.exit(1);
});
