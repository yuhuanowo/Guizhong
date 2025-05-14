const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");
const path = require("path");
const logger = require("../../utils/logger");
const config = require("../../config");
const i18n = require("../../utils/i18n");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("welcome")
        .setNameLocalizations({
            "zh-CN": "welcome",
            "zh-TW": "welcome"
        })
        .setDescription("Setup new member welcome notifications (also enables leave notifications)")
        .setDescriptionLocalizations({
            "zh-CN": "设置新成员加入通知 (同时开启离开通知)",
            "zh-TW": "設置新成員加入通知 (同時開啟離開通知)"
        })
        .addSubcommand(subcommand =>
            subcommand
                .setName("setup")
                .setDescription("Setup welcome message for new members")
                .setDescriptionLocalizations({
                    "zh-CN": "设置欢迎新成员的频道和消息",
                    "zh-TW": "設置歡迎新成員的頻道和訊息"
                })
                .addChannelOption(option =>
                    option.setName("channel")
                        .setDescription("Choose the channel for welcome messages")
                        .setDescriptionLocalizations({
                            "zh-CN": "选择要发送欢迎消息的频道",
                            "zh-TW": "選擇要發送歡迎訊息的頻道"
                        })
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName("message")
                        .setDescription("Custom welcome message that will show as @{user}, {your custom message}")
                        .setDescriptionLocalizations({
                            "zh-CN": "自定义欢迎消息 将显示成 @{user}, {你的自定消息} [随意设置后即可查看可用的占位符]",
                            "zh-TW": "自定義歡迎訊息 將顯示成 @{user}, {你的自訂訊息} [隨意設置後即可查看可用的佔位符]"
                        })
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option.setName("banner")
                        .setDescription("Welcome banner image URL (recommended size: 1024x250)")
                        .setDescriptionLocalizations({
                            "zh-CN": "欢迎横幅图片URL (建议尺寸: 1024x250)",
                            "zh-TW": "歡迎橫幅圖片URL (建議尺寸: 1024x250)"
                        })
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("preview")
                .setDescription("Preview current welcome message")
                .setDescriptionLocalizations({
                    "zh-CN": "预览当前的欢迎消息",
                    "zh-TW": "預覽當前的歡迎訊息"
                })
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("disable")
                .setDescription("Disable welcome messages")
                .setDescriptionLocalizations({
                    "zh-CN": "停用欢迎消息",
                    "zh-TW": "停用歡迎訊息"
                })
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        const language = i18n.getServerLanguage(guildId);
        
        // 读取欢迎设置
        const welcomeConfigPath = path.join(__dirname, "../../JSON/welcome.json");
        let welcomeConfig = { channels: {} };
        
        try {
            if (fs.existsSync(welcomeConfigPath)) {
                welcomeConfig = JSON.parse(fs.readFileSync(welcomeConfigPath, "utf8"));
            }
        } catch (error) {
            logger.error(`${i18n.getString("commands.welcome.errorReadingConfig", language)}: ${error.message}`);
        }
        
        if (subcommand === "setup") {
            const channel = interaction.options.getChannel("channel");
            let customMessage = interaction.options.getString("message");
            const welcomeBanner = interaction.options.getString("banner");
            
            if (!customMessage) {
                customMessage = i18n.getString("commands.welcome.defaultMessage", language);
            }
            
            // 验证横幅URL (如果提供)
            if (welcomeBanner && !isValidUrl(welcomeBanner)) {
                return interaction.reply({ 
                    content: i18n.getString("commands.welcome.invalidBannerUrl", language), 
                    ephemeral: true 
                });
            }
            
            // 保存设置
            welcomeConfig.channels[interaction.guild.id] = {
                channelId: channel.id,
                message: customMessage,
                welcomeBanner: welcomeBanner || null
            };
            
            try {
                fs.writeFileSync(welcomeConfigPath, JSON.stringify(welcomeConfig, null, 4));
                
                const embed = new EmbedBuilder()
                    .setTitle(i18n.getString("commands.welcome.setupSuccess.title", language))
                    .setDescription(i18n.getString("commands.welcome.setupSuccess.description", language, { channelId: channel.id }))
                    .addFields(
                        { 
                            name: i18n.getString("commands.welcome.customMessage", language), 
                            value: customMessage 
                        },
                        { 
                            name: i18n.getString("commands.welcome.availablePlaceholders", language), 
                            value: i18n.getString("commands.welcome.placeholdersList", language)
                        }
                    )
                    .setColor(config.embedColour)
                    .setTimestamp();
                
                if (welcomeBanner) {
                    embed.addFields({ 
                        name: i18n.getString("commands.welcome.welcomeBanner", language), 
                        value: welcomeBanner 
                    });
                    embed.setImage(welcomeBanner);
                }
                
                await interaction.reply({ embeds: [embed], ephemeral: true });
                logger.info(`[${interaction.guild.name}] ${interaction.user.tag} ${i18n.getString("commands.welcome.logSetup", language, { channelName: channel.name })}`);
            } catch (error) {
                logger.error(`${i18n.getString("commands.welcome.errorSavingConfig", language)}: ${error.message}`);
                await interaction.reply({ 
                    content: i18n.getString("commands.welcome.errorSetup", language), 
                    ephemeral: true 
                });
            }
        } else if (subcommand === "preview") {
            // 预览当前设置的欢迎消息
            const guildConfig = welcomeConfig.channels[interaction.guild.id];
            
            if (!guildConfig) {
                return interaction.reply({ 
                    content: i18n.getString("commands.welcome.notConfigured", language), 
                    ephemeral: true 
                });
            }
            
            try {
                // 寻找规则频道
                const rulesChannel = interaction.guild.channels.cache.find(ch => 
                    ch.name.toLowerCase().includes(i18n.getString("commands.welcome.rulesChannelName", language).toLowerCase()) || 
                    ch.name.toLowerCase().includes('rules'));
                
                // 处理欢迎消息预览
                const welcomeMessage = guildConfig.message || i18n.getString("commands.welcome.defaultMessage", language);
                const processedMessage = welcomeMessage
                    .replace("{user.mention}", interaction.user.toString())
                    .replace("{user.tag}", interaction.user.tag)
                    .replace("{user.name}", interaction.user.username)
                    .replace("{server}", interaction.guild.name)
                    .replace("{memberCount}", interaction.guild.memberCount);
                
                // 创建欢迎嵌入预览
                const embed = new EmbedBuilder()
                    .setTitle(i18n.getString("commands.welcome.previewEmbed.title", language, { serverName: interaction.guild.name }))
                    .setColor(config.embedColour)
                    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 512 }))
                    .setImage(guildConfig.welcomeBanner || interaction.guild.bannerURL({ size: 1024 }) || null)
                    .addFields(
                        { 
                            name: i18n.getString("commands.welcome.previewEmbed.serverInfo", language), 
                            value: i18n.getString("commands.welcome.previewEmbed.serverInfoValue", language, {
                                memberCount: interaction.guild.memberCount,
                                createdTimestamp: Math.floor(interaction.guild.createdTimestamp / 1000)
                            })
                        },
                        { 
                            name: i18n.getString("commands.welcome.previewEmbed.guide", language), 
                            value: i18n.getString("commands.welcome.previewEmbed.guideValue", language, {
                                rulesChannel: rulesChannel ? `<#${rulesChannel.id}>` : i18n.getString("commands.welcome.defaultRulesChannel", language)
                            })
                        },
                        {
                            name: i18n.getString("commands.welcome.previewEmbed.howToStart", language),
                            value: i18n.getString("commands.welcome.previewEmbed.howToStartValue", language)
                        }
                    )
                    .setFooter({ 
                        text: i18n.getString("commands.welcome.previewEmbed.footer", language, {
                            time: new Date().toLocaleString(language === 'en' ? 'en-US' : 'zh-TW', { 
                                timeZone: 'Asia/Taipei' 
                            })
                        }),
                        iconURL: interaction.guild.iconURL({ dynamic: true }) 
                    });
                
                // 设置预览说明
                const previewEmbed = new EmbedBuilder()
                    .setTitle(i18n.getString("commands.welcome.previewExplanation.title", language))
                    .setDescription(i18n.getString("commands.welcome.previewExplanation.description", language, {
                        channelId: guildConfig.channelId
                    }))
                    .setColor(config.embedColour);
                
                await interaction.reply({ 
                    embeds: [previewEmbed, embed],
                    content: `${interaction.user}, ${processedMessage}`,
                    ephemeral: true // 仅对用户可见                    
                });
                
            } catch (error) {
                logger.error(`${i18n.getString("commands.welcome.errorPreview", language)}: ${error.message}`);
                await interaction.reply({ 
                    content: i18n.getString("commands.welcome.errorPreviewMessage", language), 
                    ephemeral: true 
                });
            }
        } else if (subcommand === "disable") {
            // 停用欢迎消息
            if (welcomeConfig.channels[interaction.guild.id]) {
                delete welcomeConfig.channels[interaction.guild.id];
                
                try {
                    fs.writeFileSync(welcomeConfigPath, JSON.stringify(welcomeConfig, null, 4));
                    
                    const embed = new EmbedBuilder()
                        .setTitle(i18n.getString("commands.welcome.disableSuccess.title", language))
                        .setDescription(i18n.getString("commands.welcome.disableSuccess.description", language))
                        .setColor(config.embedColour)
                        .setTimestamp();
                    
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                    logger.info(`[${interaction.guild.name}] ${interaction.user.tag} ${i18n.getString("commands.welcome.logDisabled", language)}`);
                } catch (error) {
                    logger.error(`${i18n.getString("commands.welcome.errorDisabling", language)}: ${error.message}`);
                    await interaction.reply({ 
                        content: i18n.getString("commands.welcome.errorDisableMessage", language), 
                        ephemeral: true 
                    });
                }
            } else {
                await interaction.reply({ 
                    content: i18n.getString("commands.welcome.notConfigured", language), 
                    ephemeral: true 
                });
            }
        }
    }
};

// 验证URL是否有效
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}