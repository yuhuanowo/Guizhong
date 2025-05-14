const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const config = require("../../config");
const { useMainPlayer } = require("discord-player");
const i18n = require("../../utils/i18n");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("normalizer")
        .setDescription("Applies the normalizer effect to the current music.")
        .setNameLocalizations({
            "zh-CN": "均衡器",
            "zh-TW": "均衡器"
        })
        .setDescriptionLocalizations({
            "zh-CN": "为当前音乐应用均衡器效果。",
            "zh-TW": "為當前音樂應用均衡器效果。"
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
            queue.filters.ffmpeg.toggle(["normalizer"]);
            const isEnabled = queue.filters.ffmpeg.filters.includes("normalizer");
            const statusKey = isEnabled ? "commands.effects.normalizer.enabled" : "commands.effects.normalizer.disabled";
            embed.setDescription(i18n.getString(statusKey, language));
        }

        return await interaction.reply({ embeds: [embed] });
    },
};
