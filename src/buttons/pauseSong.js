const { EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const config = require("../config");

module.exports = {
    name: "pause_song",
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

        queue.node.setPaused(!queue.node.isPaused());

        embed.setDescription(`<@${interaction.user.id}>: 成功 ${queue.node.isPaused() === true ? "暫停" : "重新撥放"} **${queue.currentTrack.title}**.`);

        return await interaction.reply({ embeds: [embed] , ephemeral: true});
    },
};
