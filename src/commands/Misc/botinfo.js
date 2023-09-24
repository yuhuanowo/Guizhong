const { SlashCommandBuilder, ButtonBuilder, ActionRowBuilder } = require("@discordjs/builders");
const { EmbedBuilder, ButtonStyle } = require("discord.js");
const config = require("../../config");

module.exports = {
    data: new SlashCommandBuilder().setName("botinfo").setDescription("顯示有關歸終的信息."),
    async execute(interaction) {
        const embed = new EmbedBuilder();
        embed.setDescription("歸終是一個開源的音樂機器人，使用 [discord.js](https://discord.js.org)");
        embed.addField("作者", "yuhuan1125", true);
        embed.addField("版本", "v1.0.0", true);
        embed.addField("伺服器", "https://discord.gg/", true);
        embed.addField("GitHub", "https://github.com/", true);
        embed.addField("支持", "https://discord.gg/", true);
        embed.addField("開源", "MIT", true);
        embed.setColor(config.embedColour);

        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("GitHub").setURL("https://github.com"), new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Contributors").setURL("https://github.com/"), new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Support").setURL("https://github.com/"), new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Report Issue").setURL("https://github.com/"));

        return await interaction.reply({ embeds: [embed], components: [row] });
    },
};
