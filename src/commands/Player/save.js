const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const config = require("../../config");
const { useMainPlayer } = require("discord-player");
const i18n = require("../../utils/i18n");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("save")
        .setNameLocalizations({
            "zh-CN": "save",
            "zh-TW": "save"
        })
        .setDescription("Save the current track! DMs you details!")
        .setDescriptionLocalizations({
            "zh-CN": "保存当前曲目!给你发送私信!",
            "zh-TW": "保存當前曲目!給你發送私訊!"
        })
        .setDMPermission(false),
    async execute(interaction) {
        const player = useMainPlayer();
        const queue = player.nodes.get(interaction.guild.id);
        
        const guildId = interaction.guild.id;
        const language = i18n.getServerLanguage(guildId);

        const embed = new EmbedBuilder();
        embed.setColor(config.embedColour);

        if (!queue || !queue.isPlaying()) {
            embed.setTitle(i18n.getString("commands.save.notPlaying", language));
            return await interaction.reply({ embeds: [embed] });
        }

        const info = new EmbedBuilder();
        info.setColor("F44336");
        info.setTitle(`:arrow_forward: ${queue.currentTrack.title}`);
        info.setURL(queue.currentTrack.url);
        info.addFields(
            { name: i18n.getString("commands.save.dmField1", language), value: `\`${queue.currentTrack.duration}\``, inline: true }, 
            { name: i18n.getString("commands.save.dmField2", language), value: `\`${queue.currentTrack.author}\``, inline: true }, 
            { name: i18n.getString("commands.save.dmField3", language), value: `\`${Number(queue.currentTrack.views).toLocaleString()}\``, inline: true }, 
            { name: i18n.getString("commands.save.dmField4", language), value: `\`${queue.currentTrack.url}\`` }
        );
        info.setThumbnail(queue.currentTrack.thumbnail);
        info.setFooter({ 
            text: i18n.getString("commands.save.dmFooter", language, { serverName: interaction.member.guild.name }), 
            iconURL: interaction.member.guild.iconURL({ dynamic: false }) 
        });

        try {
            await interaction.user.send({ embeds: [info] });
        } catch (err) {
            embed.setDescription(i18n.getString("commands.save.dmError", language));
            return await interaction.reply({
                embeds: [embed],
                ephemeral: true,
            });
        }

        embed.setDescription(i18n.getString("commands.save.dmSuccess", language));

        return await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
