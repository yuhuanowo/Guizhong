const { EmbedBuilder, AuditLogEvent } = require("discord.js");
const config = require("../../config");
const logger = require("../../utils/logger");
const mongoose = require("mongoose");
const LogChannel = mongoose.model("LogChannel");

module.exports = {
    name: "roleCreate",
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
                        type: AuditLogEvent.RoleCreate,
                        limit: 1
                    });
                    
                    const log = auditLogs.entries.first();
                    if (log && log.target.id === role.id && log.createdTimestamp > Date.now() - 10000) {
                        executor = log.executor;
                    }
                } catch (err) {
                    logger.error(`獲取角色創建審計日誌時出錯: ${err.message}`);
                }
                
                // 創建嵌入消息
                const embed = new EmbedBuilder()
                    .setTitle("✨ 角色已創建")
                    .setDescription(`新角色 <@&${role.id}> 已創建`)
                    .setColor(role.hexColor)
                    .setTimestamp()
                    .setFooter({ text: `角色ID: ${role.id}` });
                
                // 添加角色資訊
                embed.addFields(
                    { name: '📝 角色名稱', value: role.name, inline: true },
                    { name: '🎨 顏色', value: role.hexColor, inline: true },
                    { name: '📊 顯示成員', value: role.hoist ? '是' : '否', inline: true },
                    { name: '💬 可提及', value: role.mentionable ? '是' : '否', inline: true }
                );
                
                // 添加權限資訊
                const permissionsArray = [];
                const permissions = role.permissions.toArray();
                
                if (permissions.length > 0) {
                    for (const perm of permissions) {
                        permissionsArray.push(formatPermission(perm));
                    }
                    
                    // 按字母順序排序並限制顯示數量
                    const sortedPermissions = permissionsArray.sort();
                    let permissionText = sortedPermissions.join(', ');
                    
                    // 如果權限太多，只顯示一部分
                    if (permissionText.length > 1024) {
                        permissionText = sortedPermissions.slice(0, 20).join(', ') + `... 等 ${sortedPermissions.length} 個權限`;
                    }
                    
                    embed.addFields({ name: '🔑 權限', value: permissionText || '無特殊權限', inline: false });
                }
                
                // 添加創建者資訊
                if (executor) {
                    embed.setAuthor({
                        name: executor.tag || `${executor.username}`,
                        iconURL: executor.displayAvatarURL({ dynamic: true })
                    });
                    embed.addFields({ name: '👤 創建者', value: `<@${executor.id}> (${executor.tag || executor.username})`, inline: false });
                }
                
                // 發送日誌訊息
                logChannel.send({ embeds: [embed] }).catch(err => {
                    logger.error(`無法發送角色創建日誌: ${err.message}`);
                });
            }
        } catch (error) {
            logger.error(`處理角色創建日誌時出錯: ${error.message}`);
        }
    }
};

// 格式化權限名稱
function formatPermission(permName) {
    // 將權限名稱從SCREAMING_SNAKE_CASE轉換為更友好的格式
    const formatted = permName
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, char => char.toUpperCase());
    
    const permMap = {
        'Create Instant Invite': '建立邀請',
        'Kick Members': '踢出成員',
        'Ban Members': '封鎖成員',
        'Administrator': '管理員',
        'Manage Channels': '管理頻道',
        'Manage Guild': '管理伺服器',
        'Add Reactions': '新增反應',
        'View Audit Log': '查看審核日誌',
        'Priority Speaker': '優先發言',
        'Stream': '視訊',
        'View Channel': '檢視頻道',
        'Send Messages': '發送訊息',
        'Send Tts Messages': '發送TTS訊息',
        'Manage Messages': '管理訊息',
        'Embed Links': '嵌入連結',
        'Attach Files': '附加檔案',
        'Read Message History': '讀取訊息歷史',
        'Mention Everyone': '提及所有人',
        'Use External Emojis': '使用外部表情符號',
        'View Guild Insights': '查看伺服器見解',
        'Connect': '連接語音',
        'Speak': '語音說話',
        'Mute Members': '將成員靜音',
        'Deafen Members': '將成員拒聽',
        'Move Members': '移動成員',
        'Use Vad': '使用語音活動檢測',
        'Change Nickname': '更改暱稱',
        'Manage Nicknames': '管理暱稱',
        'Manage Roles': '管理角色',
        'Manage Webhooks': '管理Webhooks',
        'Manage Emojis And Stickers': '管理表情符號和貼圖',
        'Use Application Commands': '使用應用程式命令',
        'Request To Speak': '請求發言',
        'Manage Events': '管理活動',
        'Manage Threads': '管理討論串',
        'Create Public Threads': '建立公開討論串',
        'Create Private Threads': '建立私人討論串',
        'Use External Stickers': '使用外部貼圖',
        'Send Messages In Threads': '在討論串中發送訊息',
        'Use Embedded Activities': '使用嵌入活動',
        'Moderate Members': '管理成員',
        'View Creator Monetization Analytics': '查看創作者獲利分析'
    };
    
    return permMap[formatted] || formatted;
}