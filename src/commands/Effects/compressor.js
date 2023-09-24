const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const config = require("../../config");

module.exports = {
    data: new SlashCommandBuilder().setName("compressor").setDescription("Applies the compressor effect to the current music.").setDMPermission(false),
    async execute(interaction) {
        const player = Player.singleton();
        const queue = player.nodes.get(interaction.guild.id);

        const embed = new EmbedBuilder();
        embed.setColor(config.embedColour);

        if (!queue || !queue.isPlaying()) {
            embed.setDescription("當前沒有播放音樂... 再試一次 ? ❌");
        } else {
            queue.filters.ffmpeg.toggle(["compressor"]);
            embed.setDescription(`The **compressor** filter is now ${queue.filters.ffmpeg.filters.includes("compressor") ? "enabled." : "disabled."}`);
        }

        return await interaction.reply({ embeds: [embed] });
    },
};
