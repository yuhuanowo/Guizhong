const { pipeline } = require("stream/promises");
const { createWriteStream, unlinkSync } = require("fs");
const prism = require("prism-media");
const wav = require("wav");
const { EndBehaviorType, VoiceConnectionStatus, joinVoiceChannel, entersState } = require("@discordjs/voice");
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const logger = require("../../utils/logger.js");

let recordingStreams = new Map();
let connections = new Map();

// 新增一個函式用於建立 WAV 錄音串流
function createListeningStream(receiver, user) {
  const opusStream = receiver.subscribe(user.id, {
    end: {
      behavior: EndBehaviorType.AfterSilence,
      duration: 1000,
    },
  });

  const pcmStream = new prism.opus.Decoder({
    rate: 48000,
    channels: 2,
    frameSize: 960,
  });

  const wavStream = new wav.Writer({
    sampleRate: 48000,
    channels: 2,
  });

  const filename = `./recordings/${Date.now()}-${user.id}.wav`;
  const out = createWriteStream(filename);

  logger.info(`👂 開始錄製 ${filename}`);

  const startTime = Date.now();

  const pipelinePromise = pipeline(opusStream, pcmStream, wavStream, out)
    .then(() => {
      const duration = (Date.now() - startTime) / 1000;
      if (duration < 1) {
        unlinkSync(filename);
        logger.info(`🗑️ 錄製時間過短，已刪除 ${filename}`);
      } else {
        logger.info(`✅ 錄製完成 ${filename}`);
      }
    })
    .catch((error) => {
      logger.warn(`❌ 錄製文件錯誤 ${filename} - ${error.message}`);
    });

  return {
    end: () => {
      opusStream.destroy();
      pcmStream.destroy();
      wavStream.end();
      out.end();
    },
    pipelinePromise,
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("record")
    .setDescription("開始語音錄製")
    .addSubcommand(subcommand =>
      subcommand
        .setName("start")
        .setDescription("開始錄製語音")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("stop")
        .setDescription("停止錄製語音")
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const channel = interaction.member.voice.channel;

    if (!channel) {
      return interaction.reply("請先進入語音頻道。");
    }

    if (subcommand === "start") {
      await interaction.reply("開始錄製中...");
      logger.info(`開始錄製語音，使用者: ${interaction.user.tag}`);

      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
      });

      try {
        await entersState(connection, VoiceConnectionStatus.Ready, 10_000);
      } catch (error) {
        logger.warn(`無法連接語音頻道，錯誤: ${error.message}`);
        return interaction.editReply("無法連接語音頻道。");
      }

      connections.set(interaction.user.id, connection);

      const receiver = connection.receiver;
      connection.on(VoiceConnectionStatus.Disconnected, () => {
        connection.destroy();
      });

      // 偵聽使用者的語音資料並使用 createListeningStream 產生 WAV
      receiver.speaking.on("start", (userId) => {
        const user = interaction.guild.members.cache.get(userId)?.user;
        if (!user) return;
        const stream = createListeningStream(receiver, user);
        recordingStreams.set(userId, stream);
      });

    } else if (subcommand === "stop") {
      await interaction.reply("停止錄製中...");
      logger.info(`停止錄製語音，使用者: ${interaction.user.tag}`);

      const userId = interaction.user.id;
      const stream = recordingStreams.get(userId);
      const connection = connections.get(userId);

      if (stream) {
        stream.end();
        await stream.pipelinePromise;
        recordingStreams.delete(userId);
        logger.info(`錄製已停止，使用者: ${interaction.user.tag}`);
      }

      if (connection) {
        connection.destroy();
        connections.delete(userId);
      }

      await interaction.editReply("錄製已停止。");
    }
  },
};