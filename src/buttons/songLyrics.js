const { EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const config = require("../config");
const { useMainPlayer } = require("discord-player");
const i18n = require("../utils/i18n");

module.exports = {
    name: "song_lyrics",
    async execute(interaction) {
        const player = useMainPlayer();
        const queue = player.nodes.get(interaction.guild.id);
        const guildId = interaction.guild.id;
        const language = i18n.getServerLanguage(guildId);

        const embed = new EmbedBuilder();
        embed.setColor(config.embedColour);

        if (!queue || !queue.isPlaying()) {
            embed.setDescription(i18n.getString("common.notPlaying", language));
            setTimeout(() => {
                interaction.deleteReply();
            }, 5000);
            return await interaction.reply({
                embeds: [embed],
                ephemeral: true,
            });
        }

        await interaction.deferReply({ ephemeral: false });

        try {
            // 使用 Discord Player v7 的新歌词 API
            const searchResult = await player.search(`${queue.currentTrack.title} ${queue.currentTrack.author}`);
            if (!searchResult || !searchResult.tracks[0]) {
                throw new Error("No search results found");
            }
            
            // 获取第一首歌曲的歌词
            const trackWithLyrics = await searchResult.tracks[0].fetchLyrics();
            
            let title = queue.currentTrack.title;
            let artist = queue.currentTrack.author;
            let url = queue.currentTrack.url;
            
            // 获取本地化的链接文本
            let linkText = i18n.getString("player.lyrics.clickHereText", language, {});
            
            embed.setAuthor({
                name: `${title} - ${artist}`,
                url: url,
            });
            
            if (trackWithLyrics) {
                embed.setDescription(trackWithLyrics.length > 4096 ? `${trackWithLyrics.slice(0, 4090)}...` : trackWithLyrics);
            } else {
                embed.setDescription(`${i18n.getString("player.lyricsNotFound", language)}\n[${linkText}](https://www.google.com/search?q=${encodeURIComponent(`${title} ${artist} lyrics`)})`);
            }
            embed.setFooter({ text: i18n.getString("player.lyricsCourtesy", language) });
        } catch (err) {
            console.error(err);
            embed.setDescription(i18n.getString("player.lyricsNotFound", language));
            setTimeout(() => {
                interaction.deleteReply();
            }, 5000);
        }

        return await interaction.editReply({ embeds: [embed] });
    },
};
