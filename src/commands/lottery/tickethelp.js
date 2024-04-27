//一個抽獎的功能
const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const axios = require("axios");
const { MessageEmbed, CommandInteraction, Client } = require("discord.js");
const fs = require("fs");

const { da } = require("date-fns/locale");

//help list
module.exports = {
    data: new SlashCommandBuilder().setName("tickethelp").setDescription("彩票幫助"),
    async execute(interaction = new CommandInteraction()) {
        const user = interaction.user;

        //only for yuhuanstudio
        if (interaction.guildId !== "1212954593244356689") {
            await interaction.reply("抽獎功能不適用於當前伺服器使用");
            return;
        }

        const embed = new EmbedBuilder().setTitle("彩票幫助").setDescription("這裡是彩票幫助").setColor("#FFD700").setTimestamp().addFields({ name: "購買彩票", value: "使用 /buyticket 購買彩票" }, { name: "查看彩票", value: "使用 /checkticket 查看您的彩票" }, { name: "刪除彩票", value: "使用 /delete 刪除您的彩票" }, { name: "幫助", value: "使用 /tickethelp 查看幫助" });
        await interaction.reply({ embeds: [embed] });
    },
};
