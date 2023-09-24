const { EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const { lyricsExtractor } = require("@discord-player/extractor");
const config = require("../config");

const lyricsClient = lyricsExtractor(config.geniusKey);

module.exports = {
    name: "song_lyrics",
    async execute(interaction) {
        const player = Player.singleton();
        const queue = player.nodes.get(interaction.guild.id);

        const embed = new EmbedBuilder();
        embed.setColor(config.embedColour);

        if (!queue || !queue.isPlaying()) {
            embed.setDescription("當前沒有播放音樂... 再試一次 ? ❌");
            return await interaction.reply({
                embeds: [embed],
                ephemeral: true,
            });
        }

        await interaction.deferReply({ ephemeral: true });

        await lyricsClient
            .search(`${queue.currentTrack.title} ${queue.currentTrack.author}`)
            .then((res) => {
                embed.setAuthor({
                    name: `${res.title} - ${res.artist.name}`,
                    url: res.url,
                });
                embed.setDescription(res.lyrics.length > 4096 ? `[點擊這裡查看歌詞](${res.url})` : res.lyrics);
                embed.setFooter({ text: "Courtesy of Genius" });
            })
            .catch(() => {
                embed.setDescription("找不到這首歌的任何歌詞❌");
            });

        return await interaction.editReply({ embeds: [embed] });
    },
};
