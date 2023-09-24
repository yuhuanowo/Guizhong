const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const config = require("../../config");

module.exports = {
    data: new SlashCommandBuilder().setName("clear").setDescription("清除隊列中的所有音樂").setDMPermission(false),
    async execute(interaction) {
        const player = Player.singleton();
        const queue = player.nodes.get(interaction.guild.id);

        const embed = new EmbedBuilder();
        embed.setColor(config.embedColour);

        if (!queue || !queue.isPlaying()) {
            embed.setTitle("當前沒有播放音樂... 再試一次 ? ❌");
        } else if (!queue.tracks.toArray()[0]) {
            embed.setTitle("隊列中沒有任何其他曲目，使用 **/stop**停止當前曲目❌");
        } else {
            queue.tracks.clear();
            embed.setTitle("隊列剛剛被清除 🗑️.");
        }

        return await interaction.reply({ embeds: [embed] });
    },
};
