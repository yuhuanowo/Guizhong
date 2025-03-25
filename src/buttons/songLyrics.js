const { EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const config = require("../config");
const { useMainPlayer } = require("discord-player");

module.exports = {
    name: "song_lyrics",
    async execute(interaction) {
        const player = useMainPlayer();
        const queue = player.nodes.get(interaction.guild.id);

        const embed = new EmbedBuilder();
        embed.setColor(config.embedColour);

        if (!queue || !queue.isPlaying()) {
            embed.setDescription("當前沒有播放音樂... 再試一次 ? ❌");
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
            const res = await player.lyrics.search(`${queue.currentTrack.title} ${queue.currentTrack.author}`);
            embed.setAuthor({
                name: `${res.title} - ${res.artist.name}`,
                url: res.url,
            });
            embed.setDescription(res.lyrics.length > 4096 ? `[點擊這裡查看歌詞](${res.url})` : res.lyrics);
            embed.setFooter({ text: "Courtesy of Genius" });
        } catch (err) {
            console.error(err);
            embed.setDescription("找不到這首歌的任何歌詞❌");
            setTimeout(() => {
                interaction.deleteReply();
            }, 5000);
        }

        return await interaction.editReply({ embeds: [embed] });
    },
};
