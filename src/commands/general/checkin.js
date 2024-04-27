const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const config = require("../../config");
const fs = require("fs");
const { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require("discord.js");

// 設定 JSON 文件的路徑
const checkinPath = "src/JSON/checkin.json";

// 讀取已訂閱的頻道列表
function loadcheckin() {
    try {
        const data = fs.readFileSync(checkinPath, "utf8");
        return JSON.parse(data);
    } catch (error) {
        console.error("Error loading checkin:", error);
        return {};
    }
}

// 儲存已訂閱的頻道列表
function savecheckin(checkin) {
    try {
        let data = JSON.stringify(checkin);
        fs.writeFileSync(checkinPath, data);
    } catch (error) {
        console.error("Error saving checkin:", error);
    }
}

module.exports = {
    data: new SlashCommandBuilder().setName("checkin").setDescription("每日簽到"),

    async execute(interaction = CommandInteraction) {
        // 讀取簽到資料
        const checkin = loadcheckin();

        //創建一個新的Embed，並提供下拉式選單以供選擇
        const embed = new StringSelectMenuBuilder().setPlaceholder("請選擇").setCustomId(`checkin_select_${interaction.user.id}`);

        // 逐一加入選項 (只增加當前群組的每日簽到內容) (checkin.push({guild: interaction.guildId,checkincontent: checkincontent});)
        for (let i = 0; i < checkin.length; i++) {
            if (checkin[i].guild == interaction.guildId) {
                embed.addOptions(new StringSelectMenuOptionBuilder().setLabel(checkin[i].checkincontent).setValue(checkin[i].checkincontent).setDescription(checkin[i].checkincontent));
            }
        }

        const row = new ActionRowBuilder().addComponents(embed);

        await interaction.reply({ embed: [embed], components: [row], ephemeral: true });
    },
};
