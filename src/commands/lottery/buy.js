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
    data: new SlashCommandBuilder().setName("buyticket").setDescription("購買一張彩票"),
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

        // 如果用戶沒有金錢數據，創建一個新的條目並設置其值為0
        if (money[user.id] === undefined) {
            money[user.id] = 0;
        }

        if (money[user.id] < -1000) {
            await interaction.reply("您可能沒錢了，請聯繫管理員");
            return;
        }

        money[user.id] -= 100; // 扣除彩票的價格

        // 將新的金額寫入文件
        fs.writeFileSync("src/JSON/money.json", JSON.stringify(money));

        if (!tickets[user.id]) {
            tickets[user.id] = [];
        }

        let newTicket;
        do {
            newTicket = Math.floor(Math.random() * 900) + 100; // 生成一個介於100和999之間的隨機數字
        } while (tickets[user.id].includes(newTicket)); // 如果生成的數字已經在用戶的彩票列表中，則繼續生成新的數字

        tickets[user.id].push(newTicket);

        // 將新的彩票數據寫入文件
        fs.writeFileSync("src/JSON/tickets.json", JSON.stringify(tickets));

        await interaction.reply(`您已成功購買一張彩票，您的彩票號碼是 ${newTicket}，您的當前金額是 ${money[user.id]}元`);
    },
};
