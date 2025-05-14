const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const config = require("../../config");
const { useMainPlayer } = require("discord-player");
const i18n = require("../../utils/i18n");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("stop")
        .setNameLocalizations({
            "zh-CN": "stop",
            "zh-TW": "stop"
        })
        .setDescription("Stop the current music.")
        .setDescriptionLocalizations({
            "zh-CN": "停止播放歌曲",
            "zh-TW": "停止播放歌曲"
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
        } else {
            queue.delete();
            embed.setTitle(i18n.getString("commands.stop.success", language));
        }

        return await interaction.reply({ embeds: [embed] });
    },
};
