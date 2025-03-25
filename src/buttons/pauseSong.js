const { EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const config = require("../config");
const { useMainPlayer } = require("discord-player");

module.exports = {
    name: "pause_song",
    async execute(interaction) {
        const player = useMainPlayer();
        const queue = player.nodes.get(interaction.guild.id);

        const embed = new EmbedBuilder();
        embed.setColor(config.embedColour);

        if (!queue || !queue.isPlaying()) {
            embed.setDescription("當前沒有播放音樂... 再試一次 ? ❌");
            //等待時間刪除消息
            setTimeout(() => {
                interaction.deleteReply();
            }, 5000);
            return await interaction.reply({
                embeds: [embed],
                ephemeral: false,
            });
        }

        queue.node.setPaused(!queue.node.isPaused());

        embed.setDescription(`<@${interaction.user.id}>: 成功 ${queue.node.isPaused() === true ? "暫停" : "重新撥放"} **${queue.currentTrack.title}**.`);

        if (queue.node.isPaused()) {
            //等待時間刪除消息
            setTimeout(() => {
                interaction.deleteReply();
            }, 5000);
        }
        return await interaction.reply({ embeds: [embed], ephemeral: false });
    },
};
