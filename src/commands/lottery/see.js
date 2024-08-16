//一個抽獎的功能
const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const axios = require("axios");
const { MessageEmbed, CommandInteraction, Client } = require("discord.js");
const fs = require("fs");
const { da } = require("date-fns/locale");

// 讀取已經存在的彩票數據
let tickets;
try {
    tickets = JSON.parse(fs.readFileSync("src/JSON/tickets.json", "utf8"));
} catch (err) {
    tickets = {};
}

// 讀取用戶的金額
let money;
try {
    money = JSON.parse(fs.readFileSync("src/JSON/money.json", "utf8"));
} catch (err) {
    money = {};
}

module.exports = {
    data: new SlashCommandBuilder().setName("checkallticket").setDescription("查看您的彩票"),
    async execute(interaction = new CommandInteraction()) {
        const user = interaction.user;

        //重新讀取已經存在的彩票數據
        try {
            tickets = JSON.parse(fs.readFileSync("src/JSON/tickets.json", "utf8"));
        } catch (err) {
            tickets = {};
        }

        //重新讀取已經存在的金錢數據
        try {
            money = JSON.parse(fs.readFileSync("src/JSON/money.json", "utf8"));
        } catch (err) {
            money = {};
        }

        //only for yuhuanstudio
        if (interaction.guildId !== "1212954593244356689") {
            await interaction.reply("抽獎功能不適用於當前伺服器使用");
            return;
        }


        const embed = new EmbedBuilder().setTitle("所有彩票").setDescription("所有已購買的彩票：").setColor("#FFD700");

        for (let id in tickets) {
            for (let i = 0; i < tickets[id].length; i++) {
                ticket = tickets[id][i];
                embed.addFields({ name: `用戶<@${id}>`, value: `彩票號碼：${ticket}` });
            }
        }

        await interaction.reply({ embeds: [embed] });

    }
};