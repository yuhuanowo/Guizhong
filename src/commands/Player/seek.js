const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const config = require("../../config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("seek")
        .setDescription("在歌曲中快退或快進")
        .setDMPermission(false)
        .addIntegerOption((option) => option.setName("minutes").setDescription("跳過的分鐘數.").setRequired(true))
        .addIntegerOption((option) => option.setName("seconds").setDescription("跳過的秒數.").setRequired(true)),
    async execute(interaction) {
        const player = Player.singleton();
        const queue = player.nodes.get(interaction.guild.id);

        const embed = new EmbedBuilder();
        embed.setColor(config.embedColour);

        if (!queue || !queue.isPlaying()) {
            embed.setTitle("當前沒有播放音樂... 再試一次 ? ❌.");
            return await interaction.reply({ embeds: [embed] });
        }

        const minutes = interaction.options.getInteger("minutes");
        const seconds = interaction.options.getInteger("seconds");

        const newPosition = minutes * 60 * 1000 + seconds * 1000;

        queue.node.seek(newPosition);

        embed.setTitle(`當前歌曲的時間設置 **${minutes !== 0 ? `${minutes} ${minutes == 1 ? "分" : "分"} and ` : ""} ${seconds} ${seconds == 1 ? "秒" : "秒"}**✅`);

        return await interaction.reply({ embeds: [embed] });
    },
};
