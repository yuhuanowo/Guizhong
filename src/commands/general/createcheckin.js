/** */
const { SlashCommandBuilder } = require("@discordjs/builders");
const i18n = require("../../utils/i18n");
const { EmbedBuilder } = require("discord.js");
const config = require("../../config");
const fs = require("fs");

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
    data: new SlashCommandBuilder()
        .setName("createcheckin")
        .setNameLocalizations({
            "zh-CN": "createcheckin",
            "zh-TW": "createcheckin"
        })
        .setDescription("Create a daily check-in (Admin only)")
        .setDescriptionLocalizations({
            "zh-CN": "创建每日签到(管理员专用)",
            "zh-TW": "創建每日簽到(管理員專用)"
        })
        .addStringOption((option) => option.setName("checkincontent")
                .setNameLocalizations({
                    "zh-CN": "簽到內容",
                    "zh-TW": "簽到內容"
                })
                .setDescription("Set the check-in content")
                .setDescriptionLocalizations({
                    "zh-CN": "设置签到内容",
                    "zh-TW": "設置簽到內容"
                }).setRequired(true)),

    async execute(interaction = CommandInteraction) {
        const checkincontent = interaction.options.getString("checkincontent");
        const guildId = interaction.guild.id;
        const language = i18n.getServerLanguage(guildId);

        //讀取已存在的簽到列表
        const checkin = loadcheckin();
        let find = false;
        for (let i = 0; i < checkin.length; i++) {
            //如果在對應的公會中，找到輸入的頻道ID，則會回覆訊息。
            if (checkin[i].guild === interaction.guildId && checkin[i].checkincontent === checkincontent) {
                find = true;
                await interaction.reply(i18n.getString("commands.general.checkin.alreadyExists", language));
                break;
            }
        }
        //如果沒有資料就創建一個新的並回覆結果
        if (find == false) {
            //創建新的玩家資料
            checkin.push({
                guild: interaction.guildId,
                checkincontent: checkincontent,
            });
            //儲存資料
            savecheckin(checkin);
            await interaction.reply(i18n.getString("commands.general.checkin.createSuccess", language));
        }
    },
};
