const { SlashCommandBuilder, ButtonBuilder, ActionRowBuilder } = require("@discordjs/builders");
const { EmbedBuilder, ButtonStyle } = require("discord.js");
const config = require("../../config");

module.exports = {
    data: new SlashCommandBuilder().setName("botinfo").setDescription("顯示有關歸終的信息."),
    async execute(interaction) {
        const embed = new EmbedBuilder();
        embed.setDescription("歸終是一個開源的音樂機器人，使用 [discord.js](https://discord.js.org)");
        embed.addFields(
            { name: "作者", value: "yuhuan1125", inline: true },
            { name: "版本", value: "v1.0.0", inline: true },
            { name: "伺服器", value: "https://discord.gg/", inline: true },
            { name: "GitHub", value: "https://github.com/", inline: true },
            { name: "支持", value: "https://discord.gg/", inline: true },
            { name: "開源", value: "MIT", inline: true }
        );
        embed.setColor(config.embedColour);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("GitHub").setURL("https://github.com"),
            new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Contributors").setURL("https://github.com/"),
            new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Support").setURL("https://github.com/"),
            new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Report Issue").setURL("https://github.com/")
        );

        return await interaction.reply({ embeds: [embed], components: [row] });
    },
};
