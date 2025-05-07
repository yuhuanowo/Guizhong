const { EmbedBuilder, Colors } = require("discord.js");
const config = require("../../config");
const logger = require("../../utils/logger");
const mongoose = require("mongoose");
const LogChannel = mongoose.model("LogChannel");

module.exports = {
    name: "voiceStateUpdate",
    once: false,
    async execute(oldState, newState) {
        // 機器人自己的狀態變更不記錄
        if (oldState.member.user.bot) return;
        
        try {
            // 檢查該伺服器是否有日誌設置
            if (oldState.guild) {
                const logSettings = await LogChannel.findOne({ 
                    guildId: oldState.guild.id,
                    "logTypes.voice": true
                });
                
                // 如果找到日誌設置並且語音日誌已啟用
                if (logSettings) {
                    // 取得日誌頻道
                    const channel = oldState.guild.channels.cache.get(logSettings.channelId);
                    if (!channel) return;
                    
                    let embed = new EmbedBuilder()
                        .setTitle("🔊 語音頻道更新")
                        .setColor(config.embedColour)
                        .setAuthor({ 
                            name: oldState.member.user.tag, 
                            iconURL: oldState.member.user.displayAvatarURL() 
                        })
                        .setTimestamp();
                    
                    // 用戶加入語音頻道
                    if (!oldState.channel && newState.channel) {
                        embed.setDescription(`<@${oldState.member.user.id}> 已加入語音頻道 <#${newState.channel.id}> 🎉`);
                        channel.send({ embeds: [embed] }).catch(err => {
                            logger.error(`無法發送語音狀態日誌: ${err.message}`);
                        });
                    }
                    
                    // 用戶離開語音頻道
                    else if (oldState.channel && !newState.channel) {
                        embed.setDescription(`<@${oldState.member.user.id}> 已離開語音頻道 <#${oldState.channel.id}> 😢`);
                        channel.send({ embeds: [embed] }).catch(err => {
                            logger.error(`無法發送語音狀態日誌: ${err.message}`);
                        });
                    }
                    
                    // 用戶切換語音頻道
                    else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
                        embed.setDescription(`<@${oldState.member.user.id}> 已從 <#${oldState.channel.id}> 切換到 <#${newState.channel.id}> 🔄`);
                        channel.send({ embeds: [embed] }).catch(err => {
                            logger.error(`無法發送語音狀態日誌: ${err.message}`);
                        });
                    }
                   
                }
            }
        } catch (error) {
            logger.error(`處理語音狀態更新日誌時出錯: ${error}`);
        }
    }
};