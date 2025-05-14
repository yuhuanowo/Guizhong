const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const config = require("../../config");
const { useMainPlayer } = require("discord-player");
const i18n = require("../../utils/i18n");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("resume")
        .setNameLocalizations({
            "zh-CN": "resume",
            "zh-TW": "resume"
        })
        .setDescription("Resume the current song.")
        .setDescriptionLocalizations({
            "zh-CN": "恢复播放歌曲",
            "zh-TW": "恢復播放歌曲"
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
            embed.setTitle(i18n.getString("common.notPlaying", language));
            return await interaction.reply({ embeds: [embed] });
        }

        if (!queue.node.isPaused()) {
            embed.setTitle(i18n.getString("commands.resume.alreadyPlaying", language));
            return await interaction.reply({ embeds: [embed] });
        }

        queue.node.setPaused(false);

        embed.setTitle(i18n.getString("commands.resume.success", language, {
            title: queue.currentTrack.title
        }));

        return await interaction.reply({ embeds: [embed] });
    },
};
