const { EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const config = require("../config");
const { useMainPlayer } = require("discord-player");
const i18n = require("../utils/i18n");

module.exports = {
    name: "pause_song",
    async execute(interaction) {
        const player = useMainPlayer();
        const queue = player.nodes.get(interaction.guild.id);
        const guildId = interaction.guild.id;
        const language = i18n.getServerLanguage(guildId);

        const embed = new EmbedBuilder();
        embed.setColor(config.embedColour);

        if (!queue || !queue.isPlaying()) {
            embed.setDescription(i18n.getString("commands.autoplay.notPlaying", language));
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

        const pauseText = i18n.getString("player.pause", language) || "暫停";
        const resumeText = i18n.getString("player.resume", language) || "重新撥放";
        const successText = i18n.getString("player.pauseSuccess", language, {
            user: `<@${interaction.user.id}>`,
            action: queue.node.isPaused() === true ? pauseText : resumeText,
            title: queue.currentTrack.title
        }) || `<@${interaction.user.id}>: 成功 ${queue.node.isPaused() === true ? pauseText : resumeText} **${queue.currentTrack.title}**.`;
        
        embed.setDescription(successText);

        if (queue.node.isPaused()) {
            //等待時間刪除消息
            setTimeout(() => {
                interaction.deleteReply();
            }, 5000);
        }
        return await interaction.reply({ embeds: [embed], ephemeral: false });
    },
};
