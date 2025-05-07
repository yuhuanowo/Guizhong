const { EmbedBuilder, AuditLogEvent } = require("discord.js");
const config = require("../../config");
const logger = require("../../utils/logger");
const mongoose = require("mongoose");
const LogChannel = mongoose.model("LogChannel");

module.exports = {
    name: "guildRoleUpdate", // 將 roleUpdate 改為 guildRoleUpdate
    once: false,
    async execute(oldRole, newRole, client) {
        try {
            // 檢查該伺服器是否有日誌設置
            const logSettings = await LogChannel.findOne({ 
                guildId: oldRole.guild.id,
                "logTypes.server": true
            });
            
            // 如果找到日誌設置並且伺服器日誌已啟用
            if (logSettings) {
                const logChannel = oldRole.guild.channels.cache.get(logSettings.channelId);
                if (!logChannel) return;
                
                // 檢查是否真的有變化
                if (oldRole.name === newRole.name && 
                    oldRole.color === newRole.color && 
                    oldRole.hoist === newRole.hoist &&
                    oldRole.mentionable === newRole.mentionable &&
                    oldRole.permissions.bitfield === newRole.permissions.bitfield) {
                    return;  // 沒有實質變化
                }
                
                // 嘗試獲取操作者資訊
                let executor = null;
                try {
                    const auditLogs = await oldRole.guild.fetchAuditLogs({
                        type: AuditLogEvent.RoleUpdate,
                        limit: 1
                    });
                    
                    const log = auditLogs.entries.first();
                    if (log && log.target.id === oldRole.id && log.createdTimestamp > Date.now() - 10000) {
                        executor = log.executor;
                    }
                } catch (err) {
                    logger.error(`獲取角色更新審計日誌時出錯: ${err.message}`);
                }
                
                // 創建嵌入消息
                const embed = new EmbedBuilder()
                    .setTitle("🔄 角色已更新")
                    .setDescription(`角色 <@&${newRole.id}> 已被更新`)
                    .setColor(newRole.hexColor)
                    .setTimestamp();
                    
                // 添加修改者資訊（如果有）
                if (executor) {
                    embed.setAuthor({
                        name: executor.tag || `${executor.username}`,
                        iconURL: executor.displayAvatarURL({ dynamic: true })
                    });
                    embed.addFields({ name: '👤 操作者', value: `<@${executor.id}> (${executor.tag || executor.username})`, inline: false });
                }
                
                // 添加變更內容
                if (oldRole.name !== newRole.name) {
                    embed.addFields({ name: '📝 名稱變更', value: `**舊名稱:** ${oldRole.name}\n**新名稱:** ${newRole.name}`, inline: false });
                }
                
                if (oldRole.hexColor !== newRole.hexColor) {
                    embed.addFields({ name: '🎨 顏色變更', value: `**舊顏色:** ${oldRole.hexColor}\n**新顏色:** ${newRole.hexColor}`, inline: false });
                }
                
                if (oldRole.hoist !== newRole.hoist) {
                    embed.addFields({ 
                        name: '📊 顯示成員變更', 
                        value: `**舊設定:** ${oldRole.hoist ? '啟用' : '禁用'}\n**新設定:** ${newRole.hoist ? '啟用' : '禁用'}`, 
                        inline: false 
                    });
                }
                
                if (oldRole.mentionable !== newRole.mentionable) {
                    embed.addFields({ 
                        name: '💬 可提及變更', 
                        value: `**舊設定:** ${oldRole.mentionable ? '啟用' : '禁用'}\n**新設定:** ${newRole.mentionable ? '啟用' : '禁用'}`, 
                        inline: false 
                    });
                }
                
                if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
                    // 計算權限差異
                    const addedPermissions = [];
                    const removedPermissions = [];
                    
                    for (const [permName, permBit] of Object.entries(newRole.permissions.serialize())) {
                        if (permBit && !oldRole.permissions.has(permName)) {
                            addedPermissions.push(formatPermission(permName));
                        }
                    }
                    
                    for (const [permName, permBit] of Object.entries(oldRole.permissions.serialize())) {
                        if (permBit && !newRole.permissions.has(permName)) {
                            removedPermissions.push(formatPermission(permName));
                        }
                    }
                    
                    if (addedPermissions.length > 0) {
                        embed.addFields({ 
                            name: '⚙️ 新增權限', 
                            value: addedPermissions.join(', ') || '無', 
                            inline: false 
                        });
                    }
                    
                    if (removedPermissions.length > 0) {
                        embed.addFields({ 
                            name: '🔒 移除權限', 
                            value: removedPermissions.join(', ') || '無', 
                            inline: false 
                        });
                    }
                }
                
                // 添加角色ID
                embed.setFooter({ text: `角色ID: ${newRole.id}` });
                
                // 發送日誌訊息
                logChannel.send({ embeds: [embed] }).catch(err => {
                    logger.error(`無法發送角色更新日誌: ${err.message}`);
                });
            }
        } catch (error) {
            logger.error(`處理角色更新日誌時出錯: ${error.message}`);
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