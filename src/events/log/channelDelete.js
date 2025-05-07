const { EmbedBuilder, AuditLogEvent, ChannelType } = require("discord.js");
const config = require("../../config");
const logger = require("../../utils/logger");
const mongoose = require("mongoose");
const LogChannel = mongoose.model("LogChannel");

module.exports = {
    name: "channelDelete",
    once: false,
    async execute(channel, client) {
        try {
            // 忽略DM頻道
            if (!channel.guild) return;
            
            // 檢查該伺服器是否有日誌設置
            const logSettings = await LogChannel.findOne({ 
                guildId: channel.guild.id,
                "logTypes.server": true
            });
            
            // 如果找到日誌設置並且伺服器日誌已啟用
            if (logSettings) {
                // 如果刪除的頻道是日誌頻道自己，跳過記錄
                if (channel.id === logSettings.channelId) {
                    logger.warn(`伺服器 ${channel.guild.name} (${channel.guild.id}) 的日誌頻道被刪除了`);
                    return;
                }
                
                const logChannel = channel.guild.channels.cache.get(logSettings.channelId);
                if (!logChannel) return;
                
                // 嘗試獲取操作者資訊
                let executor = null;
                try {
                    const auditLogs = await channel.guild.fetchAuditLogs({
                        type: AuditLogEvent.ChannelDelete,
                        limit: 1
                    });
                    
                    const log = auditLogs.entries.first();
                    if (log && log.target.id === channel.id && log.createdTimestamp > Date.now() - 10000) {
                        executor = log.executor;
                    }
                } catch (err) {
                    logger.error(`獲取頻道刪除審計日誌時出錯: ${err.message}`);
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
                
                // 獲取頻道所屬分類
                let categoryName = '無';
                if (channel.parent) {
                    categoryName = channel.parent.name;
                }
                
                // 創建嵌入消息
                const embed = new EmbedBuilder()
                    .setTitle("🗑️ 頻道已刪除")
                    .setDescription(`${getChannelTypeName(channel.type)} **${channel.name}** 已被刪除`)
                    .setColor(config.embedColour || "#FF0000")
                    .addFields(
                        { name: '📝 頻道名稱', value: channel.name, inline: true },
                        { name: '📋 頻道類型', value: getChannelTypeName(channel.type), inline: true },
                        { name: '📁 所屬分類', value: categoryName, inline: true }
                    )
                    .setTimestamp();
                
                // 添加修改者資訊（如果有）
                if (executor) {
                    embed.setAuthor({
                        name: `${executor.tag}`,
                        iconURL: executor.displayAvatarURL({ dynamic: true })
                    });
                    embed.addFields({ name: '👤 操作者', value: `<@${executor.id}> (${executor.tag})`, inline: false });
                }
                
                // 根據頻道類型添加額外資訊
                if (channel.topic) {
                    embed.addFields({ name: '📌 頻道主題', value: channel.topic, inline: false });
                }
                
                // 添加頻道創建時間
                const createdAt = Math.floor(channel.createdTimestamp / 1000);
                embed.addFields({ 
                    name: '📆 頻道創建於', 
                    value: `<t:${createdAt}:F> (<t:${createdAt}:R>)`, 
                    inline: false 
                });
                
                // 添加頻道ID
                embed.setFooter({ text: `頻道ID: ${channel.id}` });
                
                // 發送日誌訊息
                logChannel.send({ embeds: [embed] }).catch(err => {
                    logger.error(`無法發送頻道刪除日誌: ${err.message}`);
                });
            }
        } catch (error) {
            logger.error(`處理頻道刪除日誌時出錯: ${error}`);
        }
    }
};
