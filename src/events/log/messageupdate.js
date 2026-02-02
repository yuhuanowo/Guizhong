const { EmbedBuilder } = require("discord.js");
const config = require("../../config");
const logger = require("../../utils/logger");
const moment = require("moment"); //for time
const mongoose = require("mongoose");
const LogChannel = mongoose.model("LogChannel");

//當訊息在伺服器中被更新時
module.exports = {
    name: "messageUpdate",
    once: false,
    async execute(message, interaction, client, oldMessage, newMessage) {
        // 忽略機器人訊息
        if (message.author.bot) return;
        
        // 檢查訊息內容是否相同
        if (oldMessage.content === newMessage.content) return;
        
        // 格式化時間
        const dateCreated = moment(message.createdAt).format("YYYY-MM-DD HH:mm:ss");
        
        try {
            // 檢查該伺服器是否有日誌設置
            if (message.guild) {
                const logSettings = await LogChannel.findOne({ 
                    guildId: message.guild.id,
                    "logTypes.message": true
                });
                
                // 如果找到日誌設置並且訊息日誌已啟用
                if (logSettings) {
                    // 獲取日誌頻道
                    const channel = message.guild.channels.cache.get(logSettings.channelId);
                    if (!channel) return;
                    
                    // 創建嵌入式訊息
                    const embed = new EmbedBuilder()
                        .setTitle("✏️ 訊息已編輯")
                        .setDescription(
                            `**原訊息：**\n${oldMessage.content}\n\n` +
                            `**新訊息：**\n${newMessage.content}\n\n` +
                            `(發送於 ${dateCreated}, 頻道 <#${message.channel.id}>)`
                        )
                        .setColor(config.embedColour)
                        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
                        .setTimestamp()
                        .setFooter({ text: "訊息 ID: " + message.id });
                    
                    // 發送日誌訊息
                    channel.send({ embeds: [embed] }).catch(err => {
                        logger.error(`無法發送訊息編輯日誌: ${err.message}`);
                    });
                }
            }
        } catch (error) {
            logger.error(`處理訊息編輯日誌時出錯: ${error}`);
        }
    },
};
//那么多comments干鸡毛o.o