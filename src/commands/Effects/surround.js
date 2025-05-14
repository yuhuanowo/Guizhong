const { SlashCommandBuilder } = require("@discordjs/builders");
const i18n = require("../../utils/i18n");
const { EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const config = require("../../config");
const { useMainPlayer } = require("discord-player");

module.exports = {
    data: new SlashCommandBuilder().setName("surround")
        .setNameLocalizations({
            "zh-CN": "surround",
            "zh-TW": "surround"
        }).setDescription("Applies the surround effect to the current music.")
        .setDescriptionLocalizations({
            "zh-CN": "应用环绕音效",
            "zh-TW": "切換環繞音效"
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
            queue.filters.ffmpeg.toggle(["surround"]);
            const isEnabled = queue.filters.ffmpeg.filters.includes("surround");
            const statusKey = isEnabled ? "commands.effects.surround.enabled" : "commands.effects.surround.disabled";
            embed.setDescription(i18n.getString(statusKey, language));
        }

        return await interaction.reply({ embeds: [embed] });
    },
};
