const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { Player, QueueRepeatMode } = require("discord-player");
const config = require("../config");
const { useMainPlayer } = require("discord-player");

module.exports = {
    name: "autoplay",
    async execute(interaction) {
        const player =useMainPlayer();
        const queue = player.nodes.get(interaction.guild.id);

        const embed = new EmbedBuilder();
        embed.setColor(config.embedColour);
        //自動播放開關
        if (!queue || !queue.isPlaying()) {
            embed.setTitle("當前沒有播放音樂... 再試一次 ? ❌");
            return await interaction.reply({ embeds: [embed] });
        }

        if (queue.repeatMode === QueueRepeatMode.AUTOPLAY) {
            queue.setRepeatMode(QueueRepeatMode.OFF);
            embed.setTitle("自動播放已**禁用**❌");
            //等待時間刪除消息
            setTimeout(() => {
                interaction.deleteReply();
            }, 5000);
        } else {
            queue.setRepeatMode(QueueRepeatMode.AUTOPLAY);
            embed.setTitle("自動播放已**啟用**✅");
            //等待時間刪除消息
            setTimeout(() => {
                interaction.deleteReply();
            }, 5000);
        }
        return await interaction.reply({ embeds: [embed] });
    },
};
