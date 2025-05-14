const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { Player, QueueRepeatMode } = require("discord-player");
const config = require("../../config");
const { useMainPlayer } = require("discord-player");
const i18n = require("../../utils/i18n");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("loop")
        .setNameLocalizations({
            "zh-CN": "loop",
            "zh-TW": "loop"
        })
        .setDescription("Change the current loop mode, or enable autoplay.")
        .setDescriptionLocalizations({
            "zh-CN": "更改当前循环模式，或启用自动播放.",
            "zh-TW": "更改當前循環模式，或啟用自動播放."
        })
        .setDMPermission(false)
        .addStringOption((option) => option.setName("mode")
                .setDescription("Loop mode")
                .setDescriptionLocalizations({
                    "zh-CN": "循环模式",
                    "zh-TW": "循環模式"
                }).setRequired(true).addChoices({ name: "off", value: "off" }, { name: "queue", value: "queue" }, { name: "track", value: "track" }, { name: "autoplay", value: "autoplay" })),
    async execute(interaction) {
        const player = useMainPlayer();
        const queue = player.nodes.get(interaction.guild.id);
        const mode = interaction.options.getString("mode");
        const guildId = interaction.guild.id;
        const language = i18n.getServerLanguage(guildId);

        const embed = new EmbedBuilder();
        embed.setColor(config.embedColour);

        if (!queue || !queue.isPlaying()) {
            embed.setTitle(i18n.getString("common.notPlaying", language));
        } else {
            if (mode == "off") {
                queue.setRepeatMode(QueueRepeatMode.OFF);
                embed.setTitle(i18n.getString("commands.loop.off", language));
            } else if (mode == "queue") {
                queue.setRepeatMode(QueueRepeatMode.QUEUE);
                embed.setTitle(i18n.getString("commands.loop.queue", language));
            } else if (mode == "track") {
                queue.setRepeatMode(QueueRepeatMode.TRACK);
                embed.setTitle(i18n.getString("commands.loop.track", language));
            } else {
                queue.setRepeatMode(QueueRepeatMode.AUTOPLAY);
                embed.setTitle(i18n.getString("commands.loop.autoplay", language));
            }
        }

        return await interaction.reply({ embeds: [embed] });
    },
};
