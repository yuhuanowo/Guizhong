const { SlashCommandBuilder } = require("@discordjs/builders");
const i18n = require("../../utils/i18n");
const { EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const config = require("../../config");
const { useMainPlayer } = require("discord-player");

module.exports = {
    data: new SlashCommandBuilder().setName("expander")
        .setNameLocalizations({
            "zh-CN": "expander",
            "zh-TW": "expander"
        }).setDescription("Applies the expander effect to the current music.")
        .setDescriptionLocalizations({
            "zh-CN": "应用扩展效果",
            "zh-TW": "切換擴展效果"
        }).setDMPermission(false),
    async execute(interaction) {
        const player = useMainPlayer();
        const queue = player.nodes.get(interaction.guild.id);
        const guildId = interaction.guild.id;
        const language = i18n.getServerLanguage(guildId);

        const embed = new EmbedBuilder();
        embed.setColor(config.embedColour);

        if (!queue || !queue.isPlaying()) {
            embed.setDescription(i18n.getString("common.notPlaying", language));
        } else {
            queue.filters.ffmpeg.toggle(["expander"]);
            const isEnabled = queue.filters.ffmpeg.filters.includes("expander");
            const statusKey = isEnabled ? "commands.effects.expander.enabled" : "commands.effects.expander.disabled";
            embed.setDescription(i18n.getString(statusKey, language));
        }

        return await interaction.reply({ embeds: [embed] });
    },
};
