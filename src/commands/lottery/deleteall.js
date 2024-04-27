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

//刪除所有人的彩票 新開獎池
module.exports = {
    data: new SlashCommandBuilder().setName("deleteall").setDescription("刪除所有彩票"),
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

        //only for administrators
        if (!interaction.member.permissions.has("ADMINISTRATOR")) {
            await interaction.reply("只有管理員能使用此指令");
            return;
        }

        // 刪除所有人的彩票
        tickets = {};
        fs.writeFileSync("src/JSON/tickets.json", JSON.stringify(tickets));
        await interaction.reply("已刪除所有彩票");
    },
};
