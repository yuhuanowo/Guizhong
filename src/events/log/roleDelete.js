const { EmbedBuilder, AuditLogEvent } = require("discord.js");
const config = require("../../config");
const logger = require("../../utils/logger");
const mongoose = require("mongoose");
const LogChannel = mongoose.model("LogChannel");

module.exports = {
    name: "roleDelete",
    once: false,
    async execute(role, client) {
        try {
            // 檢查該伺服器是否有日誌設置
            const logSettings = await LogChannel.findOne({ 
                guildId: role.guild.id,
                "logTypes.server": true
            });
            
            // 如果找到日誌設置並且伺服器日誌已啟用
            if (logSettings) {
                const logChannel = role.guild.channels.cache.get(logSettings.channelId);
                if (!logChannel) return;
                
                // 嘗試獲取操作者資訊
                let executor = null;
                try {
                    const auditLogs = await role.guild.fetchAuditLogs({
                        type: AuditLogEvent.RoleDelete,
                        limit: 1
                    });
                    
                    const log = auditLogs.entries.first();
                    if (log && log.target.id === role.id && log.createdTimestamp > Date.now() - 10000) {
                        executor = log.executor;
                    }
                } catch (err) {
                    logger.error(`獲取角色刪除審計日誌時出錯: ${err.message}`);
                }
                
                // 創建嵌入消息
                const embed = new EmbedBuilder()
                    .setTitle("🗑️ 角色已刪除")
                    .setDescription(`角色 \`${role.name}\` 已被刪除`)
                    .setColor(role.hexColor || config.embedColour)
                    .setTimestamp()
                    .setFooter({ text: `角色ID: ${role.id}` });
                
                // 添加角色資訊
                embed.addFields(
                    { name: '📝 角色名稱', value: role.name, inline: true },
                    { name: '🎨 顏色', value: role.hexColor, inline: true },
                    { name: '📊 顯示成員', value: role.hoist ? '是' : '否', inline: true },
                    { name: '💬 可提及', value: role.mentionable ? '是' : '否', inline: true },
                    { name: '📅 創建於', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:F>`, inline: false }
                );
                
                // 添加刪除者資訊
                if (executor) {
                    embed.setAuthor({
                        name: executor.tag || `${executor.username}`,
                        iconURL: executor.displayAvatarURL({ dynamic: true })
                    });
                    embed.addFields({ name: '👤 刪除者', value: `<@${executor.id}> (${executor.tag || executor.username})`, inline: false });
                }
                
                // 發送日誌訊息
                logChannel.send({ embeds: [embed] }).catch(err => {
                    logger.error(`無法發送角色刪除日誌: ${err.message}`);
                });
            }
        } catch (error) {
            logger.error(`處理角色刪除日誌時出錯: ${error.message}`);
        }
    }
};