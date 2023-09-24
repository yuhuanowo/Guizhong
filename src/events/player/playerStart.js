const { SlashCommandBuilder, ButtonBuilder } = require("@discordjs/builders");
const { EmbedBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js");
const config = require("../../config");
const fs = require("node:fs");
const { Player } = require("discord-player");

module.exports = {
    name: "playerStart",
    async execute(queue, track,client,interaction) {
        const player = Player.singleton();

        const data = fs.readFileSync("src/data.json");
        var parsed = JSON.parse(data);

        parsed["songs-played"] += 1;

        fs.writeFileSync("src/data.json", JSON.stringify(parsed));

    const timestamp = track.duration;
    const trackDuration = timestamp.progress == 'Infinity' ? 'infinity (live)' : track.duration;
    const progress = queue.node.createProgressBar();

        //如果循環模式啟用 則不發送消息
        if (queue.repeatMode === 2) return;
        const embed = new EmbedBuilder();
        embed.setAuthor({ name: `▶️ 正在撥放 ${track.title} 在 ${queue.channel.name} 🎧`})
        embed.setThumbnail(track.thumbnail)
        embed.setDescription(`音量 **${queue.node.volume}**%\n持續時間 **${trackDuration}**\n撥放效果 **${queue.filters.ffmpeg.filters.length > 0 ? queue.filters.ffmpeg.filters.join(", ") : "無"}**\n撥放進度 ${progress}\n循環模式 **${queue.repeatMode === 0 ? "關閉" : queue.repeatMode === 1 ? "單曲循環" : "隊列循環"}**\n撥放用戶: ${track.requestedBy}`)
        embed.setFooter({ text: '可愛的歸終 ❤️', iconURL: client.user.displayAvatarURL({ size: 1024, dynamic: true })})
        embed.setColor('Green')
        embed.setTimestamp()


        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`back_song`)
                .setEmoji(config.backEmoji.length <= 3 ? { name: config.backEmoji.trim() } : { id: config.backEmoji.trim() })
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`pause_song`)
                .setEmoji(config.pauseEmoji.length <= 3 ? { name: config.pauseEmoji.trim() } : { id: config.pauseEmoji.trim() })
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`skip_song`)
                .setEmoji(config.pauseEmoji.length <= 3 ? { name: config.skipEmoji.trim() } : { id: config.skipEmoji.trim() })
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`stop`)
                .setEmoji(config.stopEmoji.length <= 3 ? { name: config.stopEmoji.trim() } : { id: config.stopEmoji.trim() })
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`song_lyrics`)
                .setEmoji(config.lyricsEmoji.length <= 3 ? { name: config.lyricsEmoji.trim() } : { id: config.lyricsEmoji.trim() })
                .setStyle(ButtonStyle.Secondary)
        );


        //if has already sent a message, edit it (如果以發送過訊息 則編輯它)
    if (queue.metadata.lastMessage) {
        queue.metadata.lastMessage = queue.metadata.lastMessage.then(msg => msg.edit({ embeds: [embed], components: [row] }));
    }
    //if not, send the message (如果沒有，則傳送訊息)
    else {
        queue.metadata.lastMessage = queue.metadata.channel.send({ embeds: [embed], components: [row] });
    }
    },
};
