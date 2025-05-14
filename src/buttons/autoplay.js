const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { Player, QueueRepeatMode } = require("discord-player");
const config = require("../config");
const { useMainPlayer } = require("discord-player");
const i18n = require("../utils/i18n");

module.exports = {
    name: "autoplay",
    async execute(interaction) {
        const player = useMainPlayer();
        const queue = player.nodes.get(interaction.guild.id);
        const guildId = interaction.guild.id;
        const language = i18n.getServerLanguage(guildId);

        const embed = new EmbedBuilder();
        embed.setColor(config.embedColour);
        
        // 检查是否在播放
        if (!queue || !queue.isPlaying()) {
            embed.setTitle(i18n.getString("commands.autoplay.notPlaying", language));
            return await interaction.reply({ embeds: [embed] });
        }

        // 切换自动播放模式
        if (queue.repeatMode === QueueRepeatMode.AUTOPLAY) {
            queue.setRepeatMode(QueueRepeatMode.OFF);
            embed.setTitle(i18n.getString("commands.autoplay.disabled", language));
            // 等待时间删除消息
            setTimeout(() => {
                interaction.deleteReply();
            }, 5000);
        } else {
            queue.setRepeatMode(QueueRepeatMode.AUTOPLAY);
            embed.setTitle(i18n.getString("commands.autoplay.enabled", language));
            // 等待时间删除消息
            setTimeout(() => {
                interaction.deleteReply();
            }, 5000);
        }
        
        return await interaction.reply({ embeds: [embed] });
    },
};
