const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const config = require("../../config");

module.exports = {
    data: new SlashCommandBuilder().setName("back").setDescription("回到之前的歌曲").setDMPermission(false),
    async execute(interaction) {
        const player = Player.singleton();
        const queue = player.nodes.get(interaction.guild.id);

        const embed = new EmbedBuilder();
        embed.setColor(config.embedColour);

        if (!queue || !queue.isPlaying()) {
            embed.setTitle("當前沒有播放音樂...再試一次 ? ❌");
        } else if (!queue.history.tracks.toArray()[0]) {
            embed.setTitle("在這首曲目之前沒有播放任何音樂...再試一次 ? ❌");
        } else {
            await queue.history.back();
            embed.setTitle("播放上一首曲目 ✅");
        }

        return await interaction.reply({ embeds: [embed] });
    },
};
