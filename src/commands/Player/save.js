const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const config = require("../../config");

module.exports = {
    data: new SlashCommandBuilder().setName("save").setDescription("保存當前曲目!給你發送私訊!.").setDMPermission(false),
    async execute(interaction) {
        const player = Player.singleton();
        const queue = player.nodes.get(interaction.guild.id);

        const embed = new EmbedBuilder();
        embed.setColor(config.embedColour);

        if (!queue || !queue.isPlaying()) {
            embed.setTitle("當前沒有播放音樂... 再試一次 ? ❌");
            return await interaction.reply({ embeds: [embed] });
        }

        const info = new EmbedBuilder();
        info.setColor('F44336');
        info.setTitle(`:arrow_forward: ${queue.currentTrack.title}`)
        info.setURL(queue.currentTrack.url)
        info.addFields(
            { name: ':hourglass: 持續時間:', value: `\`${queue.currentTrack.duration}\``, inline: true },
            { name: '歌曲作者:', value: `\`${queue.currentTrack.author}\``, inline: true },
            { name: '觀看次數 :eyes:', value: `\`${Number(queue.currentTrack.views).toLocaleString()}\``, inline: true },
            { name: '歌曲 URL:', value: `\`${queue.currentTrack.url}\`` }
        )
        info.setThumbnail(queue.currentTrack.thumbnail)
        info.setFooter({text:`從伺服器-> ${interaction.member.guild.name}`, iconURL: interaction.member.guild.iconURL({ dynamic: false })})


        try {
            await interaction.user.send({ embeds: [info] });
        } catch (err) {
            embed.setDescription("無法向您發送私人消息...請重試 ? ❌");
            return await interaction.reply({
                embeds: [embed],
                ephemeral: true,
            });
        }

        embed.setDescription("我已經私信給你發音樂名了 ✅");

        return await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
