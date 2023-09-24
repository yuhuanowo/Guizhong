const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const fs = require("node:fs");
const logger = require("../../utils/logger");
const config = require("../../config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("playshuffle")
        .setDescription("循環撥放歌曲清單")
        .setDMPermission(false)
        .addStringOption((option) => option.setName("playlist").setDescription("輸入撥放清單URL.").setRequired(true)),
    async execute(interaction, client) {
        await interaction.deferReply();

        const embed = new EmbedBuilder();
        embed.setColor(config.embedColour);

        const channel = interaction.member.voice.channel;

        if (!channel) {
            embed.setTitle("您不在語音頻道中...再試一次 ? ❌");
            return await interaction.editReply({ embeds: [embed] });
        }

        if (interaction.guild.members.me.voice.channelId && interaction.member.voice.channelId !== interaction.guild.members.me.voice.channelId) {
            embed.setTitle("我無法在該語音頻道中播放音樂...再試一次 ? ❌");
            return await interaction.editReply({ embeds: [embed] });
        }

        const query = interaction.options.getString("playlist");

        const player = Player.singleton(client);
        let queue = player.nodes.get(interaction.guild.id);

        if (!queue) {
            player.nodes.create(interaction.guild.id, {
                leaveOnEmptyCooldown: config.leaveOnEmptyDelay,
                leaveOnEndCooldown: config.leaveOnEndDelay,
                leaveOnStopCooldown: config.leaveOnStopDelay,
                selfDeaf: config.deafenBot,
                metadata: {
                    channel: interaction.channel,
                    client: interaction.guild.members.me,
                    requestedBy: interaction.user,
                },
            });
        }

        queue = player.nodes.get(interaction.guild.id);

        const res = await player.search(query, {
            requestedBy: interaction.user,
        });

        if (!res) {
            embed.setTitle(`找不到具有該名稱的播放列表 **${query}**...再試一次 ? ❌`);
            await queue.delete();
            return await interaction.editReply({ embeds: [embed] });
        }

        if (!res.playlist) {
            embed.setTitle("指定的查詢似乎不是播放列表...再試一次 ? ❌");
            await queue.delete();
            return await interaction.editReply({ embeds: [embed] });
        }

        try {
            if (!queue.connection) await queue.connect(interaction.member.voice.channel);
        } catch (err) {
            if (queue) queue.delete();
            embed.setTitle("我無法加入該語音頻道...再試一次 ? ❌");
            return await interaction.editReply({ embeds: [embed] });
        }

        try {
            queue.addTrack(res.tracks);
            await queue.tracks.shuffle();
            if (!queue.isPlaying()) await queue.node.play(queue.tracks[0]);
        } catch (err) {
            logger.error("嘗試播放此媒體時發生錯誤:");
            logger.error(err);

            await queue.delete();

            embed.setTitle("該媒體目前似乎無法使用...再試一次 ? ❌.");
            return await interaction.followUp({ embeds: [embed] });
        }

        const data = fs.readFileSync("src/data.json");
        const parsed = JSON.parse(data);

        parsed["queues-shuffled"] += 1;

        fs.writeFileSync("src/data.json", JSON.stringify(parsed));

        embed.setTitle(`**${res.tracks.length} 首歌** 從撥放清單--> ${res.playlist.type} **[${res.playlist.title}](${res.playlist.url})** 已加載到歌曲隊列中✅`);

        return await interaction.editReply({ embeds: [embed] });
    },
};
