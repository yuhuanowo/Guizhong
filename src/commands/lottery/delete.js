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
    data: new SlashCommandBuilder()
        .setName("delete")
        .setDescription("刪除您的彩票")
        .addIntegerOption((option) => option.setName("ticket").setDescription("要刪除的彩票號碼").setRequired(true)),
    async execute(interaction = new CommandInteraction()) {
        const user = interaction.user;
        const ticketToDelete = interaction.options.getInteger("ticket");

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

        if (!tickets[user.id]) {
            tickets[user.id] = [];
        }

        const index = tickets[user.id].indexOf(ticketToDelete);
        if (index === -1) {
            await interaction.reply("您沒有這張彩票");
            return;
        }

        tickets[user.id].splice(index, 1);

        // 將新的彩票數據寫入文件
        fs.writeFileSync("src/JSON/tickets.json", JSON.stringify(tickets));

        // 將金錢返回給用戶
        if (!money[user.id]) {
            money[user.id] = 0;
        }
        money[user.id] += 100; // 將金額增加50

        // 將新的金額寫入文件
        fs.writeFileSync("src/JSON/money.json", JSON.stringify(money));

        await interaction.reply(`您的彩票已刪除，您的當前金額是 ${money[user.id]}元`);
    },
};
