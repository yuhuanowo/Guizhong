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
        .setName("playbili")
        .setDescription("撥放歌曲.")
        .setDMPermission(false)
        .addStringOption((option) => option.setName("query").setDescription("輸入曲目名稱、作者名或 URL.").setRequired(true).setAutocomplete(config.autocomplete)),
    async execute(interaction, client) {
        await interaction.deferReply((ephemeral = true));

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

        //如果連結是bilibili
        let finalValue;
        let query;
        if (interaction.options.getString("query").includes("bilibili.com")) {
            {
                await interaction.editReply("正在處理中...請稍後");
                //分析bilibili url以取得bvid
                const requesturl = interaction.options.getString("query");
                //將video/後面的字串 /?前面的字串取出
                const bvid = requesturl.split("video/")[1].split("/?")[0];
                //將bvid放入api 以取得cid
                let data = qs.stringify({
                    bvid: bvid,
                });

                let cid;
                let avid;
                let bilibiliUrl;

                let cidconfig = {
                    method: "get",
                    maxBodyLength: Infinity,
                    url: "https://api.bilibili.com/x/web-interface/view?bvid=" + bvid,
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    data: data,
                };

                axios
                    .request(cidconfig)
                    .then((response) => {
                        console.log(JSON.stringify(response.data.data.cid));
                        console.log(JSON.stringify(response.data.data.aid));
                        cid = JSON.stringify(response.data.data.cid);
                        avid = JSON.stringify(response.data.data.aid);

                        data = qs.stringify({
                            avid: avid,
                            cid: cid,
                            qn: "6",
                            fnval: "80",
                            fnver: "0",
                            fourk: "1",
                        });
                        let config = {
                            method: "get",
                            maxBodyLength: Infinity,
                            url: "https://api.bilibili.com/x/player/playurl?avid=" + avid + "&cid=" + cid + "&qn=15&fnval=1&fnver=0&fourk=1",
                            headers: {
                                "Content-Type": "application/x-www-form-urlencoded",
                            },
                            data: data,
                        };
                        axios
                            .request(config)
                            .then((response) => {
                                console.log(JSON.stringify(response.data.data.durl[0].url));
                                bilibiliUrl = JSON.stringify(response.data.data.durl[0].url);
                                //push to outside variable
                                interaction.options.getString("query", bilibiliUrl);
                                finalValue = bilibiliUrl;
                            })
                            .catch((error) => {
                                console.log(error);
                            });
                    })
                    .catch((error) => {
                        console.log(error);
                    });
            }

            //wait 1s
            await new Promise((r) => setTimeout(r, 2000));
            //restart the function
            // if (finalValue.includes("https://upos-sz-mirroraliov.bilivideo.com"))
            // {
            //     error = "bilibili url error";

            //     return await interaction.editReply("取得不佳的bilibili cdn 再試一次 (bilibili的問題) ❌");
            // }
            //將finalvalue 前後的"去除
            finalValue = finalValue.replace(/"/g, "");
            logger.info(finalValue);
            query = finalValue;
        } else {
            //如果連結不是bilibili
            //error ->請使用/play而不是/playbili
            const embed = new EmbedBuilder();
            embed.setColor(config.embedColour);
            embed.setTitle("連結非來自 bilibili 請使用/play 再試一次 ? ❌");
            return await interaction.editReply({ embeds: [embed] });
        }

        const player =useMainPlayer(client);
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
            } else {
                embed.setTitle(`已加載 **${res.tracks[0].title}** by **${res.tracks[0].author}** 到隊列`);
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
        //AttachmentExtractor
        const resultsAttachment = await player.search("E:/music.mp3", { searchEngine: QueryType.FILE });

        const tracksYouTube = resultsYouTube.tracks.slice(0, 5).map((t) => ({
            name: `YouTube: ${`${t.title} - ${t.author} (${t.duration})`.length > 75 ? `${`${t.title} - ${t.author}`.substring(0, 75)}... (${t.duration})` : `${t.title} - ${t.author} (${t.duration})`}`,
            value: t.url,
        }));

        const tracksSpotify = resultsSpotify.tracks.slice(0, 5).map((t) => ({
            name: `Spotify: ${`${t.title} - ${t.author} (${t.duration})`.length > 75 ? `${`${t.title} - ${t.author}`.substring(0, 75)}... (${t.duration})` : `${t.title} - ${t.author} (${t.duration})`}`,
            value: t.url,
        }));

        const tracksAttachment = resultsAttachment.tracks.slice(0, 5).map((t) => ({
            name: `Attachment: ${`${t.title} - ${t.author} (${t.duration})`.length > 75 ? `${`${t.title} - ${t.author}`.substring(0, 75)}... (${t.duration})` : `${t.title} - ${t.author} (${t.duration})`}`,
            value: t.url,
        }));

        const tracks = [];

        tracksYouTube.forEach((t) => tracks.push({ name: t.name, value: t.value }));
        tracksSpotify.forEach((t) => tracks.push({ name: t.name, value: t.value }));
        tracksAttachment.forEach((t) => tracks.push({ name: t.name, value: t.value }));

        return interaction.respond(tracks);
    },
};
