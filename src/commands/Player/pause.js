const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const config = require("../../config");
const { useMainPlayer } = require("discord-player");
const i18n = require("../../utils/i18n");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("pause")
        .setNameLocalizations({
            "zh-CN": "pause",
            "zh-TW": "pause"
        })
        .setDescription("Pause the current song.")
        .setDescriptionLocalizations({
            "zh-CN": "暂停当前歌曲",
            "zh-TW": "暫停當前歌曲"
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

        queue.node.setPaused(!queue.node.isPaused());

        const pauseAction = queue.node.isPaused() === true ? 
            i18n.getString("player.pause", language) : 
            i18n.getString("player.resume", language);
            
        embed.setTitle(i18n.getString("commands.pause.success", language, {
            action: pauseAction,
            title: queue.currentTrack.title
        }));

        return await interaction.reply({ embeds: [embed] });
    },
};
