const { SlashCommandBuilder, ButtonBuilder } = require("@discordjs/builders");
const { EmbedBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js");
const { Player } = require("discord-player");
const config = require("../../config");
const { useMainPlayer } = require("discord-player");

module.exports = {
    data: new SlashCommandBuilder().setName("queue").setDescription("查看隊列中的歌曲").setDMPermission(false),
    async execute(interaction, client) {
        const player = useMainPlayer();
        const queue = player.nodes.get(interaction.guild.id);

        const embed = new EmbedBuilder();
        embed.setColor(config.embedColour);

        if (!queue || !queue.isPlaying()) {
            embed.setTitle("當前沒有播放音樂... 再試一次 ? ❌");
            return await interaction.reply({ embeds: [embed] });
        }

        const queuedTracks = queue.tracks.toArray();

        if (!queuedTracks[0]) {
            embed.setTitle("當前歌曲之後隊列中沒有音樂... 再試一次 ? ❌");
            return await interaction.reply({ embeds: [embed] });
        }

        embed.setThumbnail(interaction.guild.iconURL({ size: 2048, dynamic: true }) || client.user.displayAvatarURL({ size: 2048, dynamic: true }));
        embed.setAuthor({ name: `歌曲清單 - ${interaction.guild.name}` });

        const tracks = queuedTracks.map((track, i) => {
            return `\`${i + 1}\` [${track.title}](${track.url}) by **${track.author}** (撥放by <@${track.requestedBy.id}>)`;
        });
        const songs = queuedTracks.length;
        const nextSongs = songs > 5 ? `和 **${songs - 5}** 首歌在隊列中.` : "";
        const progress = queue.node.createProgressBar();

        embed.setDescription(`**當前曲目:** [${queue.currentTrack.title}](${queue.currentTrack.url}) by **${queue.currentTrack.author}**\n${progress}\n\n${tracks.slice(0, 5).join("\n")}\n\n${nextSongs}`);

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
