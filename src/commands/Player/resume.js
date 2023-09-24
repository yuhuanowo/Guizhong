const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const config = require("../../config");

module.exports = {
    data: new SlashCommandBuilder().setName("resume").setDescription("恢復播放歌曲").setDMPermission(false),
    async execute(interaction) {
        const player = Player.singleton();
        const queue = player.nodes.get(interaction.guild.id);

        const embed = new EmbedBuilder();
        embed.setColor(config.embedColour);

        if (!queue || !queue.isPlaying()) {
            embed.setTitle("當前沒有播放音樂... 再試一次 ? ❌");
            return await interaction.reply({ embeds: [embed] });
        }

        if (!queue.node.isPaused()) {
            embed.setTitle("該歌曲已經在播放... 再試一次 ? ❌");
            return await interaction.reply({ embeds: [embed] });
        }

        queue.node.setPaused(false);

        embed.setTitle(`當前音樂 **${queue.currentTrack.title}**已恢復 ✅`);

        return await interaction.reply({ embeds: [embed] });
    },
};
