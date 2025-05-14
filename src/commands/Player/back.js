const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const config = require("../../config");
const { useMainPlayer } = require("discord-player");
const i18n = require("../../utils/i18n");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("back")
        .setNameLocalizations({
            "zh-CN": "back",
            "zh-TW": "back"
        })
        .setDescription("Go back to the previous song")
        .setDescriptionLocalizations({
            "zh-CN": "回到之前的歌曲",
            "zh-TW": "回到之前的歌曲"
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
        } else if (!queue.history.tracks.toArray()[0]) {
            embed.setTitle(i18n.getString("commands.back.noPreviousSong", language));
        } else {
            await queue.history.back();
            embed.setTitle(i18n.getString("commands.back.success", language));
        }

        return await interaction.reply({ embeds: [embed] });
    },
};
