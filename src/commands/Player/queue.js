const { SlashCommandBuilder, ButtonBuilder } = require("@discordjs/builders");
const { EmbedBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js");
const { Player } = require("discord-player");
const config = require("../../config");
const { useMainPlayer } = require("discord-player");
const i18n = require("../../utils/i18n");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("queue")
        .setNameLocalizations({
            "zh-CN": "queue",
            "zh-TW": "queue"
        })
        .setDescription("View the songs in the queue.")
        .setDescriptionLocalizations({
            "zh-CN": "查看队列中的歌曲",
            "zh-TW": "查看隊列中的歌曲"
        })
        .setDMPermission(false),
    async execute(interaction, client) {
        const player = useMainPlayer();
        const queue = player.nodes.get(interaction.guild.id);
        const guildId = interaction.guild.id;
        const language = i18n.getServerLanguage(guildId);

        const embed = new EmbedBuilder();
        embed.setColor(config.embedColour);

        if (!queue || !queue.isPlaying()) {
            embed.setTitle(i18n.getString("common.notPlaying", language));
            return await interaction.reply({ embeds: [embed] });
        }

        const queuedTracks = queue.tracks.toArray();

        if (!queuedTracks[0]) {
            embed.setTitle(i18n.getString("player.queue.notEnoughSongs", language));
            return await interaction.reply({ embeds: [embed] });
        }

        embed.setThumbnail(interaction.guild.iconURL({ size: 2048, dynamic: true }) || client.user.displayAvatarURL({ size: 2048, dynamic: true }));
        
        // 使用本地化字符串设置队列标题
        embed.setAuthor({ 
            name: i18n.getString("commands.queue.title", language, { 
                guildName: interaction.guild.name 
            }) 
        });

        // 使用本地化字符串格式化曲目列表
        const tracks = queuedTracks.map((track, i) => {
            return i18n.getString("commands.queue.trackItem", language, {
                position: i + 1,
                title: track.title,
                url: track.url,
                author: track.author,
                requesterId: track.requestedBy.id
            });
        });
        
        const songs = queuedTracks.length;
        const nextSongs = songs > 5 ? i18n.getString("commands.queue.andMore", language, { count: songs - 5 }) : "";
        const progress = queue.node.createProgressBar();
        
        // 使用本地化字符串设置当前播放曲目描述
        const nowPlaying = i18n.getString("commands.queue.nowPlaying", language, {
            title: queue.currentTrack.title,
            url: queue.currentTrack.url,
            author: queue.currentTrack.author
        });
        
        embed.setDescription(`${nowPlaying}\n${progress}\n\n${tracks.slice(0, 5).join("\n")}\n\n${nextSongs}`);

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
    },
};
