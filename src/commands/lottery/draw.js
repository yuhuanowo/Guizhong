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
    data: new SlashCommandBuilder().setName("draw").setDescription("抽取獎品"),
    async execute(interaction = new CommandInteraction()) {
        let winners = [];
        let ticketPool = [];
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

        // Create a pool of all available tickets
        Object.values(tickets).forEach((ticketArray) => {
            ticketPool.push(...ticketArray);
        });

        for (let i = 0; i < 3; i++) {
            let winnerId;
            let winnerTicket;

            // Check if the user is an administrator
            if (interaction.member.roles.cache.some((role) => role.name === "總書記")) {
                // Administrator has double the chance of winning
                winnerId = Object.keys(tickets)[Math.floor(Math.random() * Object.keys(tickets).length)];
                winnerTicket = ticketPool.splice(Math.floor(Math.random() * ticketPool.length), 1)[0];
            } else {
                winnerId = Object.keys(tickets)[Math.floor(Math.random() * Object.keys(tickets).length)];
                winnerTicket = ticketPool.splice(Math.floor(Math.random() * ticketPool.length), 1)[0];
            }

            winners.push({ id: winnerId, ticket: winnerTicket });
        }

        // 獎項金額
        const prizeMoney = [1000, 500, 250];

        const embed = new EmbedBuilder().setTitle("抽獎結果").setDescription("恭喜以下用戶獲得獎品：").setColor("#FFD700");

        for (let i = 0; i < winners.length; i++) {
            embed.addFields({ name: `獎品${i + 1}`, value: `用戶 <@${winners[i].id}> 獲得了 ${prizeMoney[i]} 元` });

            // 給用戶金錢
            if (!money[winners[i].id]) {
                money[winners[i].id] = 0;
            }
            money[winners[i].id] += prizeMoney[i];
        }

        // 將新的金額寫入文件
        fs.writeFileSync("src/JSON/money.json", JSON.stringify(money));

        await interaction.reply({ embeds: [embed] });
    },
};
