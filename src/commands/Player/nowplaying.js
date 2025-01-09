const { SlashCommandBuilder, ButtonBuilder } = require("@discordjs/builders");
const { EmbedBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js");
const { Player } = require("discord-player");
const config = require("../../config");
const { useMainPlayer } = require("discord-player");

module.exports = {
    data: new SlashCommandBuilder().setName("nowplaying").setDescription("View information about the current track.").setDMPermission(false),
    async execute(interaction, client) {
        const player =useMainPlayer();
        const queue = player.nodes.get(interaction.guild.id);

        const embed = new EmbedBuilder();
        embed.setColor(config.embedColour);

        if (!queue || !queue.isPlaying()) {
            embed.setDescription("當前沒有播放音樂... 再試一次 ? ❌");
            return await interaction.reply({ embeds: [embed] });
        }

            
        const track = queue.currentTrack;

        const methods = ["disabled", "track", "queue"];

        const timestamp = track.duration;

        const trackDuration = timestamp.progress == "Infinity" ? "infinity (live)" : track.duration;

        const progress = queue.node.createProgressBar();

        embed.setAuthor({ name: track.title, iconURL: client.user.displayAvatarURL({ size: 1024, dynamic: true }) });
        embed.setThumbnail(track.thumbnail);
        embed.setDescription(`音量 **${queue.node.volume}**%\n持續時間 **${trackDuration}**\n撥放效果 **${queue.filters.ffmpeg.filters.length > 0 ? queue.filters.ffmpeg.filters.join(", ") : "無"}**\n撥放進度 \n${progress}\n循環模式 **${queue.repeatMode === 0 ? "關閉" : queue.repeatMode === 1 ? "單曲循環" : "隊列循環"}**\n撥放用戶: ${track.requestedBy}`);
        embed.setFooter({ text: "可愛的歸終 ❤️", iconURL: interaction.member.avatarURL({ dynamic: true }) });
        embed.setColor("Green");
        embed.setTimestamp();

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`back_song-${interaction.user.id}`)
                .setEmoji(config.backEmoji.length <= 3 ? { name: config.backEmoji.trim() } : { id: config.backEmoji.trim() })
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`pause_song-${interaction.user.id}`)
                .setEmoji(config.pauseEmoji.length <= 3 ? { name: config.pauseEmoji.trim() } : { id: config.pauseEmoji.trim() })
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`skip_song-${interaction.user.id}`)
                .setEmoji(config.pauseEmoji.length <= 3 ? { name: config.skipEmoji.trim() } : { id: config.skipEmoji.trim() })
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`stop-${interaction.user.id}`)
                .setEmoji(config.stopEmoji.length <= 3 ? { name: config.stopEmoji.trim() } : { id: config.stopEmoji.trim() })
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`song_lyrics-${interaction.user.id}`)
                .setEmoji(config.lyricsEmoji.length <= 3 ? { name: config.lyricsEmoji.trim() } : { id: config.lyricsEmoji.trim() })
                .setStyle(ButtonStyle.Secondary)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`autoplay-${interaction.user.id}`)
                .setEmoji(config.autoplayEmoji.length <= 3 ? { name: config.autoplayEmoji.trim() } : { id: config.autoplayEmoji.trim() })
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`shuffle_song-${interaction.user.id}`)
                .setEmoji(config.shuffleEmoji.length <= 3 ? { name: config.shuffleEmoji.trim() } : { id: config.shuffleEmoji.trim() })
                .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({ embeds: [embed], components: [row1, row2] });

        // //auto refreshing
        // const interval = setInterval(async () => {
        //     const queue = player.nodes.get(interaction.guild.id);
        //     if (!queue || !queue.isPlaying()) {
        //         clearInterval(interval);
        //         return;
        //     }
        
        //     const track = queue.currentTrack;
        
        //     // 直接检查track.duration是否表示直播流
        //     const trackDuration = track.duration === "Infinity" ? "infinity (live)" : track.duration;
        
        //     const progress = queue.node.createProgressBar();
        
        //     embed.setAuthor({ name: track.title, iconURL: client.user.displayAvatarURL({ size: 1024, dynamic: true }) });
        //     embed.setThumbnail(track.thumbnail);
        //     embed.setDescription(`音量 **${queue.node.volume}**%\n持續時間 **${trackDuration}**\n撥放效果 **${queue.filters.ffmpeg.filters.length > 0 ? queue.filters.ffmpeg.filters.join(", ") : "無"}**\n撥放進度 \n${progress}\n循環模式 **${queue.repeatMode === 0 ? "關閉" : queue.repeatMode === 1 ? "單曲循環" : "隊列循環"}**\n撥放用戶: ${track.requestedBy}`);
        //     embed.setFooter({ text: "可愛的歸終 ❤️", iconURL: interaction.member.avatarURL({ dynamic: true }) });
        //     embed.setColor("Green");
        //     embed.setTimestamp();
        
        //     try {
        //         await interaction.editReply({ embeds: [embed] });
        //     } catch (error) {
        //         console.error("Failed to edit reply");
        //         clearInterval(interval); // Optionally stop the interval on error
        //     }
        // }, 10000);
    }
};
