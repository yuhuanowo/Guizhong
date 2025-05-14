const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const config = require("../../config");
const { useMainPlayer } = require("discord-player");
const i18n = require("../../utils/i18n");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("8d")
        .setDescription("Applies the 8D effect to the current music.")
        .setNameLocalizations({
            "zh-CN": "8d",
            "zh-TW": "8d"
        })
        .setDescriptionLocalizations({
            "zh-CN": "为当前音乐应用8D效果。",
            "zh-TW": "為當前音樂應用8D效果。"
        })
        .setDMPermission(false),
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
            queue.filters.ffmpeg.toggle(["8D"]);
            const isEnabled = queue.filters.ffmpeg.filters.includes("8d");
            const statusKey = isEnabled ? "commands.effects.8d.enabled" : "commands.effects.8d.disabled";
            embed.setDescription(i18n.getString(statusKey, language));
        }

        return await interaction.reply({ embeds: [embed] });
    },
};
