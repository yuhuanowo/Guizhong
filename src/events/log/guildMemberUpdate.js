const { EmbedBuilder, AuditLogEvent } = require("discord.js");
const config = require("../../config");
const logger = require("../../utils/logger");
const mongoose = require("mongoose");
const LogChannel = mongoose.model("LogChannel");

module.exports = {
    name: "guildMemberUpdate", 
    once: false,
    async execute(oldMember, newMember, client) {
        try {
            // 檢查該伺服器是否有日誌設置
            const logSettings = await LogChannel.findOne({ 
                guildId: oldMember.guild.id,
                "logTypes.member": true
            });
            
            // 如果找到日誌設置並且成員日誌已啟用
            if (logSettings) {
                const logChannel = oldMember.guild.channels.cache.get(logSettings.channelId);
                if (!logChannel) return;
                
                // 檢查是否有變化
                let hasChanges = false;
                
                // 創建嵌入消息
                const embed = new EmbedBuilder()
                    .setTitle("👤 成員資訊已更新")
                    .setColor(config.embedColour)
                    .setTimestamp()
                    .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
                    .setFooter({ text: `成員ID: ${newMember.id}` });
                
                // 嘗試獲取操作者資訊
                let executor = null;
                try {
                    const auditLogs = await newMember.guild.fetchAuditLogs({
                        type: AuditLogEvent.MemberUpdate,
                        limit: 1
                    });
                    
                    const log = auditLogs.entries.first();
                    if (log && log.target.id === newMember.id && log.createdTimestamp > Date.now() - 10000) {
                        executor = log.executor;
                    }
                } catch (err) {
                    logger.error(`獲取成員更新審計日誌時出錯: ${err.message}`);
                }
                
                // 如果找到操作者，添加到嵌入消息
                if (executor) {
                    embed.setAuthor({
                        name: executor.tag || `${executor.username}`,
                        iconURL: executor.displayAvatarURL({ dynamic: true })
                    });
                    embed.setDescription(`成員 ${newMember.user} 的資訊已被 ${executor} 更新`);
                } else {
                    embed.setDescription(`成員 ${newMember.user} 的資訊已被更新`);
                }
                
                // 檢查暱稱變更
                if (oldMember.nickname !== newMember.nickname) {
                    embed.addFields({ 
                        name: '📝 暱稱變更', 
                        value: `**舊暱稱:** ${oldMember.nickname || '無暱稱'}\n**新暱稱:** ${newMember.nickname || '無暱稱'}`, 
                        inline: false 
                    });
                    hasChanges = true;
                }
                
                // 檢查角色變更
                const oldRoles = [...oldMember.roles.cache.keys()];
                const newRoles = [...newMember.roles.cache.keys()];
                
                // 添加的角色
                const addedRoles = newRoles.filter(role => !oldRoles.includes(role));
                if (addedRoles.length > 0) {
                    embed.addFields({ 
                        name: '➕ 新增角色', 
                        value: addedRoles.map(role => `<@&${role}>`).join(', '), 
                        inline: false 
                    });
                    hasChanges = true;
                    
                    // 嘗試獲取添加角色的操作者（如果之前沒有找到操作者）
                    if (!executor) {
                        try {
                            const auditLogs = await newMember.guild.fetchAuditLogs({
                                type: AuditLogEvent.MemberRoleUpdate,
                                limit: 1
                            });
                            
                            const log = auditLogs.entries.first();
                            if (log && log.target.id === newMember.id && log.createdTimestamp > Date.now() - 10000) {
                                executor = log.executor;
                                embed.setAuthor({
                                    name: executor.tag || `${executor.username}`,
                                    iconURL: executor.displayAvatarURL({ dynamic: true })
                                });
                                embed.setDescription(`成員 ${newMember.user} 的角色已被 ${executor} 更新`);
                            }
                        } catch (err) {
                            logger.error(`獲取成員角色更新審計日誌時出錯: ${err.message}`);
                        }
                    }
                }
                
                // 移除的角色
                const removedRoles = oldRoles.filter(role => !newRoles.includes(role));
                if (removedRoles.length > 0) {
                    embed.addFields({ 
                        name: '➖ 移除角色', 
                        value: removedRoles.map(role => `<@&${role}>`).join(', '), 
                        inline: false 
                    });
                    hasChanges = true;
                }
                
                // 檢查頭像變更
                const oldAvatar = oldMember.user.displayAvatarURL();
                const newAvatar = newMember.user.displayAvatarURL();
                
                if (oldAvatar !== newAvatar) {
                    embed.addFields({ 
                        name: '🖼️ 頭像變更', 
                        value: `[查看新頭像](${newMember.user.displayAvatarURL({ dynamic: true, size: 4096 })})`, 
                        inline: false 
                    });
                    hasChanges = true;
                }
                
                // 檢查用戶名變更
                if (oldMember.user.username !== newMember.user.username) {
                    embed.addFields({ 
                        name: '👤 用戶名變更', 
                        value: `**舊用戶名:** ${oldMember.user.username}\n**新用戶名:** ${newMember.user.username}`, 
                        inline: false 
                    });
                    hasChanges = true;
                }
                
                // 檢查身分組標籤變更 (僅限Discord Nitro用戶)
                if (oldMember.user.discriminator !== newMember.user.discriminator) {
                    embed.addFields({ 
                        name: '🔢 標籤變更', 
                        value: `**舊標籤:** #${oldMember.user.discriminator}\n**新標籤:** #${newMember.user.discriminator}`, 
                        inline: false 
                    });
                    hasChanges = true;
                }
                
                // 檢查加成等級變更
                if (oldMember.premiumSince !== newMember.premiumSince) {
                    if (!oldMember.premiumSince && newMember.premiumSince) {
                        embed.addFields({ 
                            name: '💎 伺服器加成', 
                            value: `成員開始加成此伺服器！\n**加成時間:** <t:${Math.floor(newMember.premiumSince.getTime() / 1000)}:F>`,
                            inline: false 
                        });
                    } else if (oldMember.premiumSince && !newMember.premiumSince) {
                        embed.addFields({ 
                            name: '💎 伺服器加成', 
                            value: '成員停止加成此伺服器', 
                            inline: false 
                        });
                    }
                    hasChanges = true;
                }
                
                // 檢查超時狀態變更
                if (oldMember.communicationDisabledUntil !== newMember.communicationDisabledUntil) {
                    if (!oldMember.communicationDisabledUntil && newMember.communicationDisabledUntil) {
                        embed.addFields({ 
                            name: '🔇 成員已被禁言', 
                            value: `**解除時間:** <t:${Math.floor(newMember.communicationDisabledUntil.getTime() / 1000)}:F>`, 
                            inline: false 
                        });
                        
                        embed.setColor('#FF9800'); // 警告顏色
                    } else if (oldMember.communicationDisabledUntil && !newMember.communicationDisabledUntil) {
                        embed.addFields({ 
                            name: '🔊 成員已解除禁言', 
                            value: `成員已被提前解除禁言`, 
                            inline: false 
                        });
                        
                        embed.setColor('#4CAF50'); // 成功顏色
                    }
                    hasChanges = true;
                }
                
                // 只有當有變化時才發送訊息
                if (hasChanges) {
                    logChannel.send({ embeds: [embed] }).catch(err => {
                        logger.error(`無法發送成員更新日誌: ${err.message}`);
                    });
                }
            }
        } catch (error) {
            logger.error(`處理成員更新日誌時出錯: ${error.message}`);
        }
    }
};