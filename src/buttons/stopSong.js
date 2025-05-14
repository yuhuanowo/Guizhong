const { EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const config = require("../config");
const { useMainPlayer } = require("discord-player");
const i18n = require("../utils/i18n");

module.exports = {
    name: "stop",
    async execute(interaction) {
        const player = useMainPlayer();
        const queue = player.nodes.get(interaction.guild.id);
        const guildId = interaction.guild.id;
        const language = i18n.getServerLanguage(guildId);

        const embed = new EmbedBuilder();
        embed.setColor(config.embedColour);

        if (!queue || !queue.isPlaying()) {
            embed.setDescription(i18n.getString("common.notPlaying", language));
            //等待時間刪除消息
            setTimeout(() => {
                interaction.deleteReply();
            }, 5000);
            return await interaction.reply({
                embeds: [embed],
                ephemeral: false,
            });
        }

        queue.delete();
        embed.setDescription(i18n.getString("player.stopSuccess", language, {
            user: `<@${interaction.user.id}>`
        }));

        return await interaction.reply({ embeds: [embed] });
    },
};
