const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const config = require("../../config");

/**
 * 關於音量的指令
 */

module.exports = {
    data: new SlashCommandBuilder()
        .setName("volume")
        .setDescription("調節當前音樂的音量。")
        .setDMPermission(false)
        .addIntegerOption((option) => option.setName("volume").setDescription("設置音樂的音量.").setRequired(true)),
    async execute(interaction) {
        const player = Player.singleton();
        const queue = player.nodes.get(interaction.guild.id);

        const embed = new EmbedBuilder();
        embed.setColor(config.embedColour);

        if (!queue || !queue.isPlaying()) {
            embed.setTitle("當前沒有播放音樂... 再試一次 ? ❌");
        } else {
            const vol = interaction.options.getInteger("volume");

            if (queue.node.volume === vol) {
                embed.setTitle(`音量已經是您想要的音量了... 再試一次 ? ❌`);
                return await interaction.reply({ embeds: [embed] });
            }

            const maxVolume = 1000;

            if (vol < 0 || vol > maxVolume) {
                embed.setTitle(`您指定的數字無效。請輸入 **0 和 ${maxVolume} 之間的數字**.`);
                return await interaction.reply({ embeds: [embed] });
            }

            const success = queue.node.setVolume(vol);
            success ? embed.setTitle(`音量已修改為 **${vol}/${maxVolume}%** 🔊.`) : embed.setTitle(`出了些問題... 再試一次 ? ❌`);
        }
 
        return await interaction.reply({ embeds: [embed] });
    },
};
