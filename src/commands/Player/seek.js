const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const config = require("../../config");
const { useMainPlayer } = require("discord-player");
const i18n = require("../../utils/i18n");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("seek")
        .setNameLocalizations({
            "zh-CN": "seek",
            "zh-TW": "seek"
        })
        .setDescription("Fast rewind or forward in the song")
        .setDescriptionLocalizations({
            "zh-CN": "在歌曲中快退或快进",
            "zh-TW": "在歌曲中快退或快進"
        })
        .setDMPermission(false)
        .addIntegerOption((option) => option.setName("minutes")
                .setDescription("Minutes to skip.")
                .setDescriptionLocalizations({
                    "zh-CN": "跳过的分钟数.",
                    "zh-TW": "跳過的分鐘數."
                }).setRequired(true))
        .addIntegerOption((option) => option.setName("seconds")
                .setDescription("Seconds to skip.")
                .setDescriptionLocalizations({
                    "zh-CN": "跳过的秒数.",
                    "zh-TW": "跳過的秒數."
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
            return await interaction.reply({ embeds: [embed] });
        }

        const minutes = interaction.options.getInteger("minutes");
        const seconds = interaction.options.getInteger("seconds");

        const newPosition = minutes * 60 * 1000 + seconds * 1000;

        queue.node.seek(newPosition);

        // Set appropriate text for minutes and seconds based on language
        const minuteText = language === "en" ? (minutes == 1 ? " minute" : " minutes") : "分";
        const secondText = language === "en" ? (seconds == 1 ? " second" : " seconds") : "秒";
        
        embed.setTitle(i18n.getString("commands.seek.success", language, { 
            minutes: minutes !== 0 ? `${minutes}${minuteText} and ` : "",
            minuteText: "", 
            seconds: seconds,
            secondText: secondText
        }));

        return await interaction.reply({ embeds: [embed] });
    },
};
