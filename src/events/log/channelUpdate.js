const { EmbedBuilder, AuditLogEvent, ChannelType } = require("discord.js");
const config = require("../../config");
const logger = require("../../utils/logger");
const mongoose = require("mongoose");
const LogChannel = mongoose.model("LogChannel");

// 用于检查是否为 DiscordSRV 的 Minecraft 状态更新
function isMinecraftStatusUpdate(oldChannel, newChannel) {
    // 检查是否为主题更新
    if (oldChannel.topic === newChannel.topic) return false;
    
    // 检查新主题是否匹配 Minecraft 状态格式
    const minecraftStatusPattern = /(\d+)\/(\d+)\s+個玩家在線\s+\|\s+\d+\s+個玩家已加入伺服器\s+\|\s+伺服器已運行\s+\d+\s+分鐘/;
    return minecraftStatusPattern.test(newChannel.topic || '');
}

module.exports = {
    name: "channelUpdate",
    once: false,
    async execute(oldChannel, newChannel, client) {
        try {
            // 忽略DM頻道
            if (!oldChannel.guild) return;
            
            // 检查是否为 Minecraft 状态更新
            if (isMinecraftStatusUpdate(oldChannel, newChannel)) {
                return; // 跳过此类更新的日志记录
            }
            
            // 檢查該伺服器是否有日誌設置
            const logSettings = await LogChannel.findOne({ 
                guildId: oldChannel.guild.id,
                "logTypes.server": true
            });
            
            // 如果找到日誌設置並且伺服器日誌已啟用
            if (logSettings) {
                const logChannel = oldChannel.guild.channels.cache.get(logSettings.channelId);
                if (!logChannel) return;
                
                // 檢查是否真的有變化
                if (oldChannel.name === newChannel.name && 
                    oldChannel.type === newChannel.type && 
                    oldChannel.topic === newChannel.topic &&
                    oldChannel.nsfw === newChannel.nsfw &&
                    oldChannel.rateLimitPerUser === newChannel.rateLimitPerUser &&
                    oldChannel.bitrate === newChannel.bitrate &&
                    oldChannel.userLimit === newChannel.userLimit) {
                    return;  // 沒有實質變化
                }
                
                // 嘗試獲取操作者資訊
                let executor = null;
                try {
                    const auditLogs = await oldChannel.guild.fetchAuditLogs({
                        type: AuditLogEvent.ChannelUpdate,
                        limit: 1
                    });
                    
                    const log = auditLogs.entries.first();
                    if (log && log.target.id === oldChannel.id && log.createdTimestamp > Date.now() - 10000) {
                        executor = log.executor;
                    }
                } catch (err) {
                    logger.error(`獲取頻道更新審計日誌時出錯: ${err.message}`);
                }
                
                // 獲取頻道類型名稱
                function getChannelTypeName(type) {
                    switch(type) {
                        case ChannelType.GuildText: return '文字頻道';
                        case ChannelType.GuildVoice: return '語音頻道';
                        case ChannelType.GuildCategory: return '分類頻道';
                        case ChannelType.GuildAnnouncement: return '公告頻道';
                        case ChannelType.GuildForum: return '論壇頻道';
                        case ChannelType.GuildStageVoice: return '舞台頻道';
                        default: return '未知類型頻道';
                    }
                }
                
                // 創建嵌入消息
                const embed = new EmbedBuilder()
                    .setTitle("⚙️ 頻道已更新")
                    .setDescription(`頻道 <#${newChannel.id}> 已被更新`)
                    .setColor(config.embedColour || "#FFA500")
                    .setTimestamp();
                    
                // 添加修改者資訊（如果有）
                if (executor) {
                    embed.setAuthor({
                        name: `${executor.tag}`,
                        iconURL: executor.displayAvatarURL({ dynamic: true })
                    });
                }
                
                // 添加變更內容
                if (oldChannel.name !== newChannel.name) {
                    embed.addFields({ name: '📝 名稱變更', value: `**舊名稱:** ${oldChannel.name}\n**新名稱:** ${newChannel.name}`, inline: false });
                }
                
                if (oldChannel.type !== newChannel.type) {
                    embed.addFields({ 
                        name: '🔄 類型變更', 
                        value: `**舊類型:** ${getChannelTypeName(oldChannel.type)}\n**新類型:** ${getChannelTypeName(newChannel.type)}`, 
                        inline: false 
                    });
                }
                
                // 根據頻道類型處理相關屬性
                if (oldChannel.type === ChannelType.GuildText || oldChannel.type === ChannelType.GuildAnnouncement) {
                    if (oldChannel.topic !== newChannel.topic) {
                        embed.addFields({ 
                            name: '📋 主題變更', 
                            value: `**舊主題:** ${oldChannel.topic || '無'}\n**新主題:** ${newChannel.topic || '無'}`, 
                            inline: false 
                        });
                    }
                    
                    if (oldChannel.nsfw !== newChannel.nsfw) {
                        embed.addFields({ 
                            name: '🔞 年齡限制變更', 
                            value: `**舊設定:** ${oldChannel.nsfw ? '啟用' : '禁用'}\n**新設定:** ${newChannel.nsfw ? '啟用' : '禁用'}`, 
                            inline: false 
                        });
                    }
                    
                    if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
                        embed.addFields({ 
                            name: '⏱️ 慢速模式變更', 
                            value: `**舊設定:** ${oldChannel.rateLimitPerUser}秒\n**新設定:** ${newChannel.rateLimitPerUser}秒`, 
                            inline: false 
                        });
                    }
                }
                
                if (oldChannel.type === ChannelType.GuildVoice || oldChannel.type === ChannelType.GuildStageVoice) {
                    if (oldChannel.bitrate !== newChannel.bitrate) {
                        embed.addFields({ 
                            name: '🔊 位元率變更', 
                            value: `**舊設定:** ${Math.round(oldChannel.bitrate / 1000)}kbps\n**新設定:** ${Math.round(newChannel.bitrate / 1000)}kbps`, 
                            inline: false 
                        });
                    }
                    
                    if (oldChannel.userLimit !== newChannel.userLimit) {
                        const oldLimit = oldChannel.userLimit === 0 ? '無限制' : `${oldChannel.userLimit}人`;
                        const newLimit = newChannel.userLimit === 0 ? '無限制' : `${newChannel.userLimit}人`;
                        
                        embed.addFields({ 
                            name: '👥 使用者限制變更', 
                            value: `**舊設定:** ${oldLimit}\n**新設定:** ${newLimit}`, 
                            inline: false 
                        });
                    }
                }
                
                // 添加頻道ID
                embed.setFooter({ text: `頻道ID: ${newChannel.id}` });
                
                // 發送日誌訊息
                logChannel.send({ embeds: [embed] }).catch(err => {
                    logger.error(`無法發送頻道更新日誌: ${err.message}`);
                });
            }
        } catch (error) {
            logger.error(`處理頻道更新日誌時出錯: ${error}`);
        }
    }
};
