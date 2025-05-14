const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const config = require("../../config");
const { useMainPlayer } = require("discord-player");
const i18n = require("../../utils/i18n");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("clear")
        .setNameLocalizations({
            "zh-CN": "clear",
            "zh-TW": "clear"
        })
        .setDescription("Clear all songs in the queue")
        .setDescriptionLocalizations({
            "zh-CN": "清除队列中的所有音乐",
            "zh-TW": "清除隊列中的所有音樂"
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
        } else if (!queue.tracks.toArray()[0]) {
            embed.setTitle(i18n.getString("commands.clear.noOtherTracks", language));
        } else {
            queue.tracks.clear();
            embed.setTitle(i18n.getString("commands.clear.success", language));
        }

        return await interaction.reply({ embeds: [embed] });
    },
};
