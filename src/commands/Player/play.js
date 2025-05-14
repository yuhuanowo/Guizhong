const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { Player, useMainPlayer, QueryType } = require("discord-player");
const logger = require("../../utils/logger");
const config = require("../../config");
const i18n = require("../../utils/i18n");
const ffmpeg = require("fluent-ffmpeg");
ffmpeg.setFfmpegPath("C:/Program Files (x86)/ffmpeg/bin/ffmpeg.exe");
ffmpeg.setFfprobePath("C:/Program Files (x86)/ffmpeg/bin/ffprobe.exe");
const axios = require("axios");
const qs = require("qs");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("play")
        .setNameLocalizations({
            "zh-CN": "play",
            "zh-TW": "play"
        })
        .setDescription("Play a song.")
        .setDescriptionLocalizations({
            "zh-CN": "播放一首歌曲。",
            "zh-TW": "播放一首歌曲。"
        })
        .setDMPermission(false)
        .addStringOption((option) => 
            option.setName("query")
                .setDescription("Enter the song name, artist or URL.")
                .setDescriptionLocalizations({
                    "zh-CN": "输入歌曲名称、艺术家或 URL。",
                    "zh-TW": "輸入歌曲名稱、藝術家或 URL。"
                })
                .setRequired(true)
                .setAutocomplete(config.autocomplete)
        ),
    async execute(interaction, client) {
        await interaction.deferReply();
        
        const guildId = interaction.guild.id;
        const language = i18n.getServerLanguage(guildId);

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
            embed.setTitle(i18n.getString("commands.play.notInVoiceChannel", language));
            return await interaction.editReply({ embeds: [embed] });
        }
        if (interaction.guild.members.me.voice.channelId && interaction.member.voice.channelId !== interaction.guild.members.me.voice.channelId) {
            embed.setTitle(i18n.getString("commands.play.cantPlayInChannel", language));
            return await interaction.editReply({ embeds: [embed] });
        }

        //如果連結是bilibili 提示改使用/playbili
        if (interaction.options.getString("query").includes("bilibili.com")) {
            embed.setTitle(i18n.getString("commands.play.useBiliCommand", language));
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
                embed.setTitle(i18n.getString("commands.play.playlistNotFound", language, { query: query }));
                return await interaction.editReply({ embeds: [embed] });
            }

            try {
                if (!queue.connection) await queue.connect(interaction.member.voice.channel);
            } catch (err) {
                if (queue) queue.delete();
                embed.setTitle(i18n.getString("commands.play.cantJoin", language));
                return await interaction.editReply({ embeds: [embed] });
            }

            try {
                res.playlist ? queue.addTrack(res.tracks) : queue.addTrack(res.tracks[0]);
                if (!queue.isPlaying()) await queue.node.play(queue.tracks[0]);
            } catch (err) {
                logger.error(i18n.getString("commands.play.error", language));
                logger.error(err);

                await queue.delete();

                embed.setTitle(i18n.getString("commands.play.mediaUnavailable", language));
                return await interaction.followUp({ embeds: [embed], ephemeral: true });
            }

            if (!res.playlist) {
                embed.setTitle(i18n.getString("commands.play.trackAdded", language, { 
                    title: res.tracks[0].title,
                    author: res.tracks[0].author
                }));
                //等待時間後刪除訊息
                setTimeout(() => {
                    interaction.deleteReply();
                }, 10000);
            } else {
                embed.setTitle(i18n.getString("commands.play.trackAdded", language, { 
                    title: res.tracks[0].title,
                    author: res.tracks[0].author
                }));
                //等待時間後刪除訊息
                setTimeout(() => {
                    interaction.deleteReply();
                }, 10000);
            }
        } catch (err) {
            logger.error(err);
            return interaction.editReply({ content: i18n.getString("commands.play.error", language) });
        }

        return await interaction.editReply({ embeds: [embed], ephemeral: true });
    },
    async autocompleteRun(interaction) {
        const player = useMainPlayer();
        const query = interaction.options.getString("query", true);
        const resultsYouTube = await player.search(query, { searchEngine: QueryType.YOUTUBE });
        const resultsSpotify = await player.search(query, { searchEngine: QueryType.SPOTIFY_SEARCH });
        const resultsSoundCloud = await player.search(query, { searchEngine: QueryType.SOUNDCLOUD_SEARCH });
        const resultsAppleMusic = await player.search(query, { searchEngine: QueryType.APPLE_MUSIC_SEARCH });

        const tracksYouTube = resultsYouTube.tracks.slice(0, 5).map((t) => ({
            name: `YouTube: ${`${t.title} - ${t.author} (${t.duration})`.length > 75 ? `${`${t.title} - ${t.author}`.substring(0, 75)}... (${t.duration})` : `${t.title} - ${t.author} (${t.duration})`}`,
            value: t.url,
        }));

        const tracksSpotify = resultsSpotify.tracks.slice(0, 5).map((t) => ({
            name: `Spotify: ${`${t.title} - ${t.author} (${t.duration})`.length > 75 ? `${`${t.title} - ${t.author}`.substring(0, 75)}... (${t.duration})` : `${t.title} - ${t.author} (${t.duration})`}`,
            value: t.url,
        }));
        const tracksSoundCloud = resultsSoundCloud.tracks.slice(0, 5).map((t) => ({
            name: `SoundCloud: ${`${t.title} - ${t.author} (${t.duration})`.length > 75 ? `${`${t.title} - ${t.author}`.substring(0, 75)}... (${t.duration})` : `${t.title} - ${t.author} (${t.duration})`}`,
            value: t.url,
        }));


        const tracks = [];

        tracksYouTube.forEach((t) => tracks.push({ name: t.name, value: t.value }));
        tracksSpotify.forEach((t) => tracks.push({ name: t.name, value: t.value }));
        tracksSoundCloud.forEach((t) => tracks.push({ name: t.name, value: t.value }));

        return interaction.respond(tracks);
    },
};
