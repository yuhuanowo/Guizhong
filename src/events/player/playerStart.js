const { SlashCommandBuilder, ButtonBuilder } = require("@discordjs/builders");
const { EmbedBuilder, ActionRowBuilder, ButtonStyle, Message } = require("discord.js");
const config = require("../../config");
const fs = require("node:fs");
const { Player } = require("discord-player");
const { get } = require("node:http");
const { useMainPlayer } = require("discord-player");
const i18n = require("../../utils/i18n");

module.exports = {
    name: "playerStart",
    async execute(queue, track, client, interaction) {
        const player = useMainPlayer();
        const guildId = queue.guild.id;
        const language = i18n.getServerLanguage(guildId);

        const data = fs.readFileSync("src/JSON/data.json");
        var parsed = JSON.parse(data);

        parsed["songs-played"] += 1;

        fs.writeFileSync("src/JSON/data.json", JSON.stringify(parsed));

        const timestamp = track.duration;
        const trackDuration = timestamp.progress == "Infinity" ? "infinity (live)" : track.duration;
        const progress = queue.node.createProgressBar();

        // 如果循環模式啟用 則不發送消息
        if (queue.repeatMode === 2) return;
        
        // 获取本地化的"正在播放"文本
        const nowPlayingText = i18n.getString("player.nowPlaying", language, {
            title: track.title,
            channel: queue.channel.name
        });
        
        const embed = new EmbedBuilder();
        embed.setAuthor({ name: nowPlayingText });
        embed.setThumbnail(track.thumbnail);
        
        // 获取本地化的"持续时间"和"请求者"文本
        const durationText = i18n.getString("player.duration", language);
        const requestedByText = i18n.getString("player.requestedBy", language);
        
        // 需要在本地化文件中添加這些字符串
        const volumeText = i18n.getString("player.volume", language, { volume: queue.node.volume }) || `音量 **${queue.node.volume}**%`;
        const effectsText = i18n.getString("player.effects", language) || "撥放效果";
        const noEffectsText = i18n.getString("player.noEffects", language) || "無";
        const progressText = i18n.getString("player.progress", language) || "撥放進度";
        const loopModeText = i18n.getString("player.loopMode", language) || "循環模式";
        
        // 循環模式文本
        let loopState;
        if (queue.repeatMode === 0) {
            loopState = i18n.getString("player.loopOff", language) || "關閉";
        } else if (queue.repeatMode === 1) {
            loopState = i18n.getString("player.loopTrack", language) || "單曲循環";
        } else {
            loopState = i18n.getString("player.loopQueue", language) || "隊列循環";
        }
        
        embed.setDescription(`${volumeText}\n${durationText} **${trackDuration}**\n${effectsText} **${queue.filters.ffmpeg.filters.length > 0 ? queue.filters.ffmpeg.filters.join(", ") : noEffectsText}**\n${progressText} ${progress}\n${loopModeText} **${loopState}**\n${requestedByText}: ${track.requestedBy}`);
        embed.setFooter({ text: "可愛的歸終 ❤️", iconURL: client.user.displayAvatarURL({ size: 1024, dynamic: true }) });
        embed.setColor("Green");
        embed.setTimestamp();

        // 获取本地化的按钮标签
        const backText = i18n.getString("player.buttons.back", language);
        const pauseText = i18n.getString("player.buttons.pause", language);
        const skipText = i18n.getString("player.buttons.skip", language);
        const stopText = i18n.getString("player.buttons.stop", language);
        
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`back_song`)
                .setEmoji(config.backEmoji.length <= 3 ? { name: config.backEmoji.trim() } : { id: config.backEmoji.trim() })
                .setLabel(backText)
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`pause_song`)
                .setEmoji(config.pauseEmoji.length <= 3 ? { name: config.pauseEmoji.trim() } : { id: config.pauseEmoji.trim() })
                .setLabel(pauseText)
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`skip_song`)
                .setEmoji(config.pauseEmoji.length <= 3 ? { name: config.skipEmoji.trim() } : { id: config.skipEmoji.trim() })
                .setLabel(skipText)
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`stop`)
                .setEmoji(config.stopEmoji.length <= 3 ? { name: config.stopEmoji.trim() } : { id: config.stopEmoji.trim() })
                .setLabel(stopText)
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`song_lyrics`)
                .setEmoji(config.lyricsEmoji.length <= 3 ? { name: config.lyricsEmoji.trim() } : { id: config.lyricsEmoji.trim() })
                .setLabel(i18n.getString("player.buttons.lyrics", language))
                .setStyle(ButtonStyle.Secondary)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`autoplay`)
                .setEmoji(config.autoplayEmoji.length <= 3 ? { name: config.autoplayEmoji.trim() } : { id: config.autoplayEmoji.trim() })
                .setLabel(i18n.getString("player.buttons.autoplay", language))
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`shuffle_song`)
                .setEmoji(config.shuffleEmoji.length <= 3 ? { name: config.shuffleEmoji.trim() } : { id: config.shuffleEmoji.trim() })
                .setLabel(i18n.getString("player.buttons.shuffle", language))
                .setStyle(ButtonStyle.Secondary)
        );

        //if has already sent a message, edit it (如果以發送過訊息 則編輯它)
        if (queue.metadata.lastMessage) {
            queue.metadata.lastMessage = queue.metadata.lastMessage.then((msg) => msg.edit({ embeds: [embed], components: [row1, row2] }));
        }
        //if not, send the message (如果沒有，則傳送訊息)
        else {
            queue.metadata.lastMessage = queue.metadata.channel.send({ embeds: [embed], components: [row1, row2] });
        }
    },
};
