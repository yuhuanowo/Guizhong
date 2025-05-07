const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");
const path = require("path");
const logger = require("../../utils/logger");
const config = require("../../config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("welcome")
        .setDescription("設置新成員加入通知 (同時開啟離開通知)")
        .addSubcommand(subcommand =>
            subcommand
                .setName("setup")
                .setDescription("設置歡迎新成員的頻道和訊息")
                .addChannelOption(option =>
                    option.setName("channel")
                        .setDescription("選擇要發送歡迎訊息的頻道")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName("message")
                        .setDescription("自定義歡迎訊息 將顯示成 @{user}, {你的自訂訊息} [隨意設置後即可查看可用的佔位符]")
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option.setName("banner")
                        .setDescription("歡迎橫幅圖片URL (建議尺寸: 1024x250)")
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("preview")
                .setDescription("預覽當前的歡迎訊息")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("disable")
                .setDescription("停用歡迎訊息")
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        // 讀取歡迎設置
        const welcomeConfigPath = path.join(__dirname, "../../JSON/welcome.json");
        let welcomeConfig = { channels: {} };
        
        try {
            if (fs.existsSync(welcomeConfigPath)) {
                welcomeConfig = JSON.parse(fs.readFileSync(welcomeConfigPath, "utf8"));
            }
        } catch (error) {
            logger.error(`讀取歡迎配置時發生錯誤: ${error.message}`);
        }
        
        if (subcommand === "setup") {
            const channel = interaction.options.getChannel("channel");
            let customMessage = interaction.options.getString("message");
            const welcomeBanner = interaction.options.getString("banner");
            
            if (!customMessage) {
                customMessage = "👋 歡迎 {user.mention} 加入 {server}！";
            }
            
            // 驗證橫幅URL (如果提供)
            if (welcomeBanner && !isValidUrl(welcomeBanner)) {
                return interaction.reply({ content: "❌ 提供的橫幅URL無效。請確保它是一個有效的圖片URL。", ephemeral: true });
            }
            
            // 保存設置
            welcomeConfig.channels[interaction.guild.id] = {
                channelId: channel.id,
                message: customMessage,
                welcomeBanner: welcomeBanner || null
            };
            
            try {
                fs.writeFileSync(welcomeConfigPath, JSON.stringify(welcomeConfig, null, 4));
                
                const embed = new EmbedBuilder()
                    .setTitle("✅ 歡迎訊息已設置")
                    .setDescription(`歡迎訊息將在 <#${channel.id}> 頻道顯示`)
                    .addFields(
                        { name: "自定義訊息", value: customMessage },
                        { 
                            name: "可用的佔位符", 
                            value: "`{user.mention}` - 提及用戶\n`{user.tag}` - 用戶名稱與標籤\n`{user.name}` - 僅用戶名稱\n`{server}` - 伺服器名稱\n`{memberCount}` - 成員總數"
                        }
                    )
                    .setColor(config.embedColour)
                    .setTimestamp();
                
                if (welcomeBanner) {
                    embed.addFields({ name: "歡迎橫幅", value: welcomeBanner });
                    embed.setImage(welcomeBanner);
                }
                
                await interaction.reply({ embeds: [embed],ephemeral: true });
                logger.info(`[${interaction.guild.name}] ${interaction.user.tag} 設置了歡迎訊息在 #${channel.name} 頻道`);
            } catch (error) {
                logger.error(`保存歡迎配置時發生錯誤: ${error.message}`);
                await interaction.reply({ content: "❌ 設置歡迎訊息時發生錯誤，請稍後再試。", ephemeral: true });
            }
        } else if (subcommand === "preview") {
            // 預覽當前設置的歡迎訊息
            const guildConfig = welcomeConfig.channels[interaction.guild.id];
            
            if (!guildConfig) {
                return interaction.reply({ content: "⚠️ 此伺服器尚未設置歡迎訊息。", ephemeral: true });
            }
            
            try {
                // 尋找規則頻道
                const rulesChannel = interaction.guild.channels.cache.find(ch => 
                    ch.name.toLowerCase().includes('規則') || 
                    ch.name.toLowerCase().includes('rules'));
                
                // 處理歡迎訊息預覽
                const welcomeMessage = guildConfig.message || "👋 歡迎 {user.mention} 加入 {server}！";
                const processedMessage = welcomeMessage
                    .replace("{user.mention}", interaction.user.toString())
                    .replace("{user.tag}", interaction.user.tag)
                    .replace("{user.name}", interaction.user.username)
                    .replace("{server}", interaction.guild.name)
                    .replace("{memberCount}", interaction.guild.memberCount);
                
                // 創建歡迎嵌入預覽
                const embed = new EmbedBuilder()
                    .setTitle(`🌟 歡迎加入 ${interaction.guild.name} 🌟`)
                    .setColor(config.embedColour)
                    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 512 }))
                    .setImage(guildConfig.welcomeBanner || interaction.guild.bannerURL({ size: 1024 }) || null)
                    .addFields(
                        { 
                            name: '📊 伺服器資訊', 
                            value: `> 🧑‍🤝‍🧑 您是第 **${interaction.guild.memberCount}** 位成員\n> 📅 伺服器創建於 <t:${Math.floor(interaction.guild.createdTimestamp / 1000)}:R>` 
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
                        iconURL: interaction.guild.iconURL({ dynamic: true }) 
                    });
                
                // 設置預覽說明
                const previewEmbed = new EmbedBuilder()
                    .setTitle("📝 歡迎訊息預覽")
                    .setDescription(`以下是新成員加入時將顯示的訊息預覽\n發送頻道: <#${guildConfig.channelId}>`)
                    .setColor(config.embedColour);
                
                await interaction.reply({ 
                    embeds: [previewEmbed, embed],
                    content: `${interaction.user}, ${processedMessage}`,
                    ephemeral: true // 僅對用戶可見                    
                });
                
            } catch (error) {
                logger.error(`預覽歡迎訊息時發生錯誤: ${error.message}`);
                await interaction.reply({ content: "❌ 預覽歡迎訊息時發生錯誤，請稍後再試。", ephemeral: true });
            }
        } else if (subcommand === "disable") {
            // 停用歡迎訊息
            if (welcomeConfig.channels[interaction.guild.id]) {
                delete welcomeConfig.channels[interaction.guild.id];
                
                try {
                    fs.writeFileSync(welcomeConfigPath, JSON.stringify(welcomeConfig, null, 4));
                    
                    const embed = new EmbedBuilder()
                        .setTitle("✅ 歡迎訊息已停用")
                        .setDescription("此伺服器的歡迎訊息功能已停用")
                        .setColor(config.embedColour)
                        .setTimestamp();
                    
                    await interaction.reply({ embeds: [embed],ephemeral: true });
                    logger.info(`[${interaction.guild.name}] ${interaction.user.tag} 停用了歡迎訊息`);
                } catch (error) {
                    logger.error(`停用歡迎配置時發生錯誤: ${error.message}`);
                    await interaction.reply({ content: "❌ 停用歡迎訊息時發生錯誤，請稍後再試。", ephemeral: true });
                }
            } else {
                await interaction.reply({ content: "⚠️ 此伺服器尚未設置歡迎訊息。", ephemeral: true });
            }
        }
    }
};

// 驗證URL是否有效
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}