const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const config = require("../../config");
const fs = require("fs");

module.exports = {
    data: new SlashCommandBuilder().setName("stats").setDescription("顯示統計數據."),
    async execute(interaction, client) {
        let rawdata = fs.readFileSync("src/data.json");
        var data = JSON.parse(rawdata);

        const embed = new EmbedBuilder();
        embed.setDescription(`歸終目前在**${client.guilds.cache.size} servers**,有撥放過 **${data["songs-played"]} 首歌**, 跳過 **${data["songs-skipped"]} 首歌**, 並隨機播放 **${data["queues-shuffled"]} 個撥放清單**.`);
        embed.setColor(config.embedColour);

        return await interaction.reply({ embeds: [embed] });
    },
};
