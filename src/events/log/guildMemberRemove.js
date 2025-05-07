const { EmbedBuilder, Colors } = require("discord.js");
const config = require("../../config");
const logger = require("../../utils/logger");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const LogChannel = mongoose.model("LogChannel");

module.exports = {
    name: "guildMemberRemove",
    once: false,
    async execute(member, client) {
        // 忽略機器人
        if (member.user.bot) return;
        logger.info(`[${member.guild.name}] ${member.user.tag} 已離開伺服器`);
        
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
                
                // 獲取離開用戶原有的角色
                let rolesList = "沒有角色資訊";
                
                // 如果能獲取角色資訊
                if (member.roles && member.roles.cache) {
                    const roles = member.roles.cache
                        .filter(role => role.id !== member.guild.id) // 過濾掉@everyone角色
                        .sort((a, b) => b.position - a.position) // 按位置排序
                        .map(role => role.toString())
                        .join(', ') || '無角色';
                        
                    rolesList = roles;
                }
                
                // 獲取帳號創建時間和加入伺服器時間
                const createdAccount = Math.floor(member.user.createdTimestamp / 1000);
                const joinedServer = member.joinedTimestamp ? Math.floor(member.joinedTimestamp / 1000) : '未知';
                
                // 計算在伺服器的時間
                let timeInServer = '無法計算';
                if (member.joinedTimestamp) {
                    const timeInMs = Date.now() - member.joinedTimestamp;
                    const days = Math.floor(timeInMs / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((timeInMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((timeInMs % (1000 * 60 * 60)) / (1000 * 60));
                    timeInServer = `${days}天 ${hours}小時 ${minutes}分鐘`;
                }
                
                // 創建成員離開訊息
                const embed = new EmbedBuilder()
                    .setTitle("👋 成員離開")
                    .setDescription(`<@${member.user.id}> (${member.user.tag}) 已離開伺服器`)
                    .setColor(config.embedColour || Colors.Red)
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                    .addFields(
                        { name: '📊 伺服器成員數', value: `${member.guild.memberCount} 位成員`, inline: true },
                        { name: '🔖 用戶ID', value: member.user.id, inline: true },
                        { name: '📆 帳號創建於', value: `<t:${createdAccount}:R> (<t:${createdAccount}:F>)`, inline: true },
                        { name: '⏰ 加入時間', value: typeof joinedServer === 'number' ? `<t:${joinedServer}:R> (<t:${joinedServer}:F>)` : joinedServer, inline: true },
                        { name: '📝 在伺服器的時間', value: timeInServer, inline: true },
                        { name: '👥 擁有的角色', value: rolesList, inline: false }
                    )
                    .setFooter({ text: `成員ID: ${member.user.id}` })
                    .setTimestamp();
                
                // 發送日誌訊息
                logChannel.send({ embeds: [embed] }).catch(err => {
                    logger.error(`無法發送成員離開日誌: ${err.message}`);
                });
            }
            
            // 處理傳統離開訊息邏輯 (welcome.json)
            const welcomeConfigPath = path.join(__dirname, "../../JSON/welcome.json");
            if (fs.existsSync(welcomeConfigPath)) {
                const welcomeConfig = JSON.parse(fs.readFileSync(welcomeConfigPath, "utf8"));
                
                // 檢查該伺服器是否有設置歡迎頻道
                const guildConfig = welcomeConfig.channels[member.guild.id];
                
                if (guildConfig && guildConfig.channelId) {
                    // 獲取歡迎頻道
                    const channel = member.guild.channels.cache.get(guildConfig.channelId);
                    
                    if (!channel || !channel.permissionsFor(member.guild.members.me).has('SendMessages')) {
                        return;
                    }

                    const leave = member.user.tag + " 已離開伺服器";
                    
                    // 離別句子（感傷風格，添加emoji並@用戶）
                    const farewellMessages = [
                        `🌙 夜色漸深，${member.user} 悄然離去，留下的只有回憶... ✨`,
                        `🌠 ${member.user} 的身影在星空下漸行漸遠，願前路順遂... 🛤️`,
                        `🍃 一陣風過，${member.user} 已不在此地，但故事仍在繼續... 📖`,
                        `🌈 每一次別離都是為了更好的重逢，期待與 ${member.user} 的再次相遇... 👋`,
                        `🌊 揮手不必傷感，${member.user} 的足跡已成為伺服器的一部分... 👣`,
                        `🌸 花開花落，${member.user} 的故事暫告一段落，願你前程似錦... 🌺`,
                        `🌧️ 雨過天晴，${member.user} 的離開讓天空多了一絲寂寞... ☁️`,
                        `🕊️ ${member.user} 如白鴿飛離，願你在遠方自由翱翔... 🌏`,
                        `🌓 月有陰晴圓缺，${member.user} 的離去是人生必經的風景... 🌌`,
                        `🍂 落葉歸根，${member.user} 的名字將被我們銘記... 📝`,
                        `🎐 風鈴輕響，${member.user} 的笑聲猶在耳邊... 🎶`,
                        `🛤️ 旅途漫長，${member.user} 踏上新的征程，祝一路順風... 🚉`,
                        `🌻 陽光下的回憶，${member.user} 永遠閃耀在我們心中... 💛`,
                        `🕰️ 時光流轉，${member.user} 的身影漸行漸遠，願你安好... ⏳`,
                        `🌃 夜幕降臨，${member.user} 的故事在星空下延續... ⭐`,
                        `🍀 幸運與你同在，${member.user}，期待未來的重逢... 🌟`,
                        `🌌 星空浩瀚，${member.user} 的離開讓宇宙多了一份思念... 💫`,
                        `🧳 行囊已備，${member.user} 踏上新的旅途，願你一路平安... 🚀`,
                        `🌺 花落無聲，${member.user} 的溫柔仍在心頭... 💐`,
                        `🦋 蝴蝶飛舞，${member.user} 的故事還未完結... 📚`,
                    ];
                    
                    // 隨機選擇一句離別語
                    const farewell = farewellMessages[Math.floor(Math.random() * farewellMessages.length)];
                    
                    const embed = new EmbedBuilder()
                        .setTitle(`👋 ${leave}`)
                        .setDescription(farewell)
                        .setColor(config.embedColour || Colors.Red)
                        .setTimestamp();
                        
                    // 發送離開訊息
                    await channel.send({ embeds: [embed] })
                    .then(() => {
                        logger.info(`[${member.guild.name}] 成功發送離開訊息: ${leave}`);
                    })
                    .catch(err => {
                        logger.error(`[${member.guild.name}] 發送離開訊息失敗: ${err.message}`);
                    });
                }
            }
        } catch (error) {
            logger.error(`處理成員離開事件時出錯: ${error.message}`);
        }
    },
};