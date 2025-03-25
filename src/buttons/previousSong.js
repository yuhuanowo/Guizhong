const { EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const config = require("../config");
const { useMainPlayer } = require("discord-player");

module.exports = {
    name: "back_song",
    async execute(interaction) {
        const player = useMainPlayer();
        const queue = player.nodes.get(interaction.guild.id);

        const embed = new EmbedBuilder();
        embed.setColor(config.embedColour);
        //等待時間刪除消息
        setTimeout(() => {
            interaction.deleteReply();
        }, 5000);

        if (!queue || !queue.isPlaying()) {
            embed.setDescription("當前沒有播放音樂... 再試一次 ? ❌");
            return await interaction.reply({
                embeds: [embed],
                ephemeral: true,
            });
        }

        if (!queue.history.tracks.toArray()[0]) {
            embed.setDescription("在這首曲目之前沒有播放任何音樂...再試一次 ? ❌");
            return await interaction.reply({
                embeds: [embed],
                ephemeral: true,
            });
        }

        await queue.history.back();
        embed.setDescription(`<@${interaction.user.id}>: 播放上一首曲目 ✅.`);

        return await interaction.reply({ embeds: [embed] });
    },
};
