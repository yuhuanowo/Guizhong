const { EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const config = require("../config");
const { useMainPlayer } = require("discord-player");
const i18n = require("../utils/i18n");

module.exports = {
    name: "back_song",
    async execute(interaction) {
        const player = useMainPlayer();
        const queue = player.nodes.get(interaction.guild.id);
        const guildId = interaction.guild.id;
        const language = i18n.getServerLanguage(guildId);

        const embed = new EmbedBuilder();
        embed.setColor(config.embedColour);
        //等待時間刪除消息
        setTimeout(() => {
            interaction.deleteReply();
        }, 5000);

        if (!queue || !queue.isPlaying()) {
            embed.setDescription(i18n.getString("common.notPlaying", language));
            return await interaction.reply({
                embeds: [embed],
                ephemeral: true,
            });
        }

        if (!queue.history.tracks.toArray()[0]) {
            embed.setDescription(i18n.getString("player.previousError", language));
            return await interaction.reply({
                embeds: [embed],
                ephemeral: true,
            });
        }

        await queue.history.back();
        embed.setDescription(i18n.getString("player.previousSuccess", language, {
            user: `<@${interaction.user.id}>`
        }));

        return await interaction.reply({ embeds: [embed] });
    },
};
