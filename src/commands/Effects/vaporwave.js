const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const config = require("../../config");
const { useMainPlayer } = require("discord-player");

module.exports = {
    data: new SlashCommandBuilder().setName("vaporwave").setDescription("Applies the vaporwave effect to the current music.").setDMPermission(false),
    async execute(interaction) {
        const player = useMainPlayer();
        const queue = player.nodes.get(interaction.guild.id);

        const embed = new EmbedBuilder();
        embed.setColor(config.embedColour);

        if (!queue || !queue.isPlaying()) {
            embed.setDescription("當前沒有播放音樂... 再試一次 ? ❌");
        } else {
            queue.filters.ffmpeg.toggle(["vaporwave"]);
            embed.setDescription(`The **vaporwave** filter is now ${queue.filters.ffmpeg.filters.includes("vaporwave") ? "enabled." : "disabled."}`);
        }

        return await interaction.reply({ embeds: [embed] });
    },
};
