const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const config = require("../../config");
const { useMainPlayer } = require("discord-player");
const i18n = require("../../utils/i18n");

/**
 * 關於音量的指令
 */

module.exports = {
    data: new SlashCommandBuilder()
        .setName("volume")
        .setNameLocalizations({
            "zh-CN": "volume",
            "zh-TW": "volume"
        })
        .setDescription("Adjust the volume of the current music.")
        .setDescriptionLocalizations({
            "zh-CN": "调节当前音乐的音量。",
            "zh-TW": "調節當前音樂的音量。"
        })
        .setDMPermission(false)
        .addIntegerOption((option) => option.setName("volume")
                .setDescription("Set the music volume.")
                .setDescriptionLocalizations({
                    "zh-CN": "设置音乐的音量.",
                    "zh-TW": "設置音樂的音量."
                }).setRequired(true)),
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
            const vol = interaction.options.getInteger("volume");

            if (queue.node.volume === vol) {
                embed.setTitle(i18n.getString("commands.volume.alreadyAtVolume", language));
                return await interaction.reply({ embeds: [embed] });
            }

            const maxVolume = 100;

            if (vol < 0 || vol > maxVolume) {
                embed.setTitle(i18n.getString("commands.volume.invalidNumber", language, { maxVolume: maxVolume }));
                return await interaction.reply({ embeds: [embed] });
            }

            const success = queue.node.setVolume(vol);
            success ? embed.setTitle(i18n.getString("commands.volume.success", language, { volume: vol })) : embed.setTitle(i18n.getString("common.error", language));
        }

        return await interaction.reply({ embeds: [embed] });
    },
};
