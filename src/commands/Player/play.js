const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { Player, useMainPlayer, QueryType } = require("discord-player");
const logger = require("../../utils/logger");
const config = require("../../config");
const ffmpeg = require("fluent-ffmpeg");
ffmpeg.setFfmpegPath("C:/Program Files (x86)/ffmpeg/bin/ffmpeg.exe");
ffmpeg.setFfprobePath("C:/Program Files (x86)/ffmpeg/bin/ffprobe.exe");
const axios = require("axios");
const qs = require("qs");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription("撥放歌曲.")
        .setDMPermission(false)
        .addStringOption((option) => option.setName("query").setDescription("輸入曲目名稱、作者名或 URL.").setRequired(true).setAutocomplete(config.autocomplete)),
    async execute(interaction, client) {
        await interaction.deferReply();

        //如果連結是youtube music 會轉成youtube
        if (interaction.options.getString("query").includes("music.youtube.com")) {
            const url = interaction.options.getString("query");
            const newUrl = url.replace("music.youtube.com", "www.youtube.com");
            interaction.options.getString("query", newUrl);
        }

        //錯誤訊息embed
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

        //如果連結是bilibili 提示改使用/playbili
        if (interaction.options.getString("query").includes("bilibili.com")) {
            embed.setTitle("請使用 /playbili 播放bilibili音樂...再試一次 ? ❌");
            return await interaction.editReply({ embeds: [embed] });
        }

        query = interaction.options.getString("query");

        const player = useMainPlayer(client);
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

        try {
            const res = await player.search(query, {
                requestedBy: interaction.user,
            });

            if (!res || !res.tracks || res.tracks.length === 0) {
                if (queue) queue.delete();
                embed.setTitle(`找不到具有該名稱的播放列表 **${query}**...再試一次 ? ❌`);
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
                res.playlist ? queue.addTrack(res.tracks) : queue.addTrack(res.tracks[0]);
                if (!queue.isPlaying()) await queue.node.play(queue.tracks[0]);
            } catch (err) {
                logger.error("嘗試播放此媒體時發生錯誤:");
                logger.error(err);

                await queue.delete();

                embed.setTitle("該媒體目前似乎無法使用...再試一次 ? ❌");
                return await interaction.followUp({ embeds: [embed], ephemeral: true });
            }

            if (!res.playlist) {
                embed.setTitle(`已加載 **${res.tracks[0].title}** by **${res.tracks[0].author}** 到隊列.`);
                //等待時間後刪除訊息
                setTimeout(() => {
                    interaction.deleteReply();
                }, 10000);
            } else {
                embed.setTitle(`已加載 **${res.tracks[0].title}** by **${res.tracks[0].author}** 到隊列`);
                //等待時間後刪除訊息
                setTimeout(() => {
                    interaction.deleteReply();
                }, 10000);
            }
        } catch (err) {
            logger.error(err);
            return interaction.editReply({ content: "嘗試播放此媒體時發生錯誤...再試一次 ? ❌" });
        }

        return await interaction.editReply({ embeds: [embed], ephemeral: true });
    },
    async autocompleteRun(interaction) {
        const player = useMainPlayer();
        const query = interaction.options.getString("query", true);
        const resultsYouTube = await player.search(query, { searchEngine: QueryType.YOUTUBE });
        const resultsSpotify = await player.search(query, { searchEngine: QueryType.SPOTIFY_SEARCH });

        const tracksYouTube = resultsYouTube.tracks.slice(0, 5).map((t) => ({
            name: `YouTube: ${`${t.title} - ${t.author} (${t.duration})`.length > 75 ? `${`${t.title} - ${t.author}`.substring(0, 75)}... (${t.duration})` : `${t.title} - ${t.author} (${t.duration})`}`,
            value: t.url,
        }));

        const tracksSpotify = resultsSpotify.tracks.slice(0, 5).map((t) => ({
            name: `Spotify: ${`${t.title} - ${t.author} (${t.duration})`.length > 75 ? `${`${t.title} - ${t.author}`.substring(0, 75)}... (${t.duration})` : `${t.title} - ${t.author} (${t.duration})`}`,
            value: t.url,
        }));

        const tracks = [];

        tracksYouTube.forEach((t) => tracks.push({ name: t.name, value: t.value }));
        tracksSpotify.forEach((t) => tracks.push({ name: t.name, value: t.value }));

        return interaction.respond(tracks);
    },
};
