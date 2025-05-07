const { EmbedBuilder, Colors, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../../config");
const logger = require("../../utils/logger");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const LogChannel = mongoose.model("LogChannel");

module.exports = {
    name: "guildMemberAdd",
    once: false,
    async execute(member, client) {
        // 忽略機器人
        if (member.user.bot) return;
        logger.info(`[${member.guild.name}] ${member.user.tag} 已加入伺服器`);
        const welcomeConfigPath = path.join(__dirname, "../../JSON/welcome.json");
        try {
            // 檢查該伺服器是否有日誌設定
            const logSettings = await LogChannel.findOne({ 
                guildId: member.guild.id,
                "logTypes.member": true
            });
            
            // 如果找到日誌設定並且成員日誌已啟用
            if (logSettings) {
                const logChannel = member.guild.channels.cache.get(logSettings.channelId);
                if (!logChannel) return;
                
                // 計算帳號年齡
                const createdAccount = Math.floor(member.user.createdTimestamp / 1000);
                const joinedServer = Math.floor(member.joinedTimestamp / 1000);
                
                // 創建成員加入訊息
                const embed = new EmbedBuilder()
                    .setTitle("👋 新成員加入")
                    .setDescription(`<@${member.user.id}> (${member.user.tag}) 已加入伺服器`)
                    .setColor(config.embedColour || Colors.Green)
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                    .addFields(
                        { name: '📊 伺服器成員數', value: `${member.guild.memberCount} 位成員`, inline: true },
                        { name: '🔖 用戶ID', value: member.user.id, inline: true },
                        { name: '📆 帳號創建於', value: `<t:${createdAccount}:R> (<t:${createdAccount}:F>)`, inline: true },
                        { name: '⏰ 加入時間', value: `<t:${joinedServer}:R> (<t:${joinedServer}:F>)`, inline: true }
                    )
                    .setFooter({ text: `成員ID: ${member.user.id}` })
                    .setTimestamp();
                
                // 若帳號太新 (不到7天)，添加警告
                const accountAge = Date.now() - member.user.createdTimestamp;
                if (accountAge < 7 * 24 * 60 * 60 * 1000) { // 7天
                    embed.addFields({
                        name: '⚠️ 新帳號警告',
                        value: `此帳號僅創建了 ${Math.floor(accountAge / (24 * 60 * 60 * 1000))} 天，請多加留意`,
                        inline: false
                    });
                }
                
                // 發送日誌訊息
                logChannel.send({ embeds: [embed] }).catch(err => {
                    logger.error(`無法發送成員加入日誌: ${err.message}`);
                });
            }
            
            // 處理傳統歡迎訊息邏輯 (welcome.json)
            if (fs.existsSync(welcomeConfigPath)) {
                const welcomeConfig = JSON.parse(fs.readFileSync(welcomeConfigPath, "utf8"));
                
                // 檢查該伺服器是否有設置歡迎頻道
                const guildConfig = welcomeConfig.channels[member.guild.id];
                
                if (guildConfig && guildConfig.channelId) {
                    // 獲取歡迎頻道
                    const channel = member.guild.channels.cache.get(guildConfig.channelId);
                    
                    if (!channel) {
                        logger.error(`[${member.guild.name}] 歡迎頻道未找到: ${guildConfig.channelId}`);
                        return;
                    }
                    if (!channel.permissionsFor(member.guild.members.me).has('SendMessages')) {
                        logger.error(`[${member.guild.name}] 機器人無法在頻道 #${channel.name} 發送訊息，請檢查權限。`);
                        return;
                    }

                    // 尋找規則頻道
                    const rulesChannel = member.guild.channels.cache.find(ch => 
                        ch.name.toLowerCase().includes('規則') || 
                        ch.name.toLowerCase().includes('rules'));
                    
                    // 尋找Discord官方的身份組頻道
                    const rolesChannel = member.guild.channels.cache.find(ch => 
                        ch.name.toLowerCase().includes('頻道與身份組'));

                    // 處理自定義訊息
                    let welcomeMessage = guildConfig.message || "👋 歡迎 {user.mention} 加入 {server}！";
                    welcomeMessage = welcomeMessage
                        .replace("{user.mention}", `<@${member.user.id}>`)
                        .replace("{user.tag}", member.user.tag)
                        .replace("{user.name}", member.user.username)
                        .replace("{server}", member.guild.name)
                        .replace("{memberCount}", member.guild.memberCount);
                    
                    // 創建歡迎嵌入
                    const embed = new EmbedBuilder()
                        .setTitle(`🌟 歡迎加入 ${member.guild.name} 🌟`)
                        .setColor(config.embedColour || Colors.Blurple)
                        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
                        .setImage(guildConfig.welcomeBanner || member.guild.bannerURL({ size: 1024 }) || null)
                        .addFields(
                            { 
                                name: '📊 伺服器資訊', 
                                value: `> 🧑‍🤝‍🧑 您是第 **${member.guild.memberCount}** 位成員\n> 📅 伺服器創建於 <t:${Math.floor(member.guild.createdTimestamp / 1000)}:R>` 
                            },
                            { 
                                name: '🔍 新手指南', 
                                value: [
                                    `> 🔰 請在頻道列表頂部的 **「頻道與身份組」** 選擇您感興趣的身份組，解鎖對應頻道`,
                                    `> 📜 請在 ${rulesChannel ? `<#${rulesChannel.id}>` : '#規則'} 查看伺服器必讀規則`,
                                    `> 💡 點擊身份組名稱可以切換獲取/移除該身份組`,
                                    `> ❓ 有任何問題，請隨時聯繫管理員`
                                ].join('\n')
                            },
                            {
                                name: '🎮 如何開始？',
                                value: [
                                    `> 1️⃣ 查看伺服器規則`,
                                    `> 2️⃣ 前往頻道列表上方「頻道與身份組」區域，選擇您感興趣的身份組`,
                                    `> 3️⃣ 解鎖並探索各個主題頻道`,
                                    `> 4️⃣ 開始與社群互動！`
                                ].join('\n')
                            }
                        )
                        .setFooter({ 
                            text: `加入時間 • ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}`,
                            iconURL: member.guild.iconURL({ dynamic: true }) 
                        });

                    // 發送歡迎訊息
                    channel.send({ 
                        content: `<@${member.user.id}>, ${welcomeMessage}`,
                        embeds: [embed],
                    })
                    .then(() => {
                        logger.info(`[${member.guild.name}] 發送歡迎訊息給 ${member.user.tag} 在 #${channel.name} 頻道`);
                    })
                    .catch(err => {
                        logger.error(`[${member.guild.name}] 發送歡迎訊息失敗: ${err.message}`);
                    });
                }
            }
        } catch (error) {
            logger.error(`處理成員加入事件時出錯: ${error.message}`);
        }
    },
};