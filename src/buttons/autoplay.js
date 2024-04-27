const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { Player, QueueRepeatMode } = require("discord-player");
const config = require("../config");

module.exports = {
    name: "autoplay",
    async execute(interaction) {
        const player = Player.singleton();
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
        } else {
            queue.setRepeatMode(QueueRepeatMode.AUTOPLAY);
            embed.setTitle("自動播放已**啟用**✅");
        }
        return await interaction.reply({ embeds: [embed] });
    },
};
