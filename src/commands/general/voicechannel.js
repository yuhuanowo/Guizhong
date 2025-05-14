const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { EmbedBuilder } = require("discord.js");
const config = require("../../config");
const fs = require("node:fs");
const path = require("node:path");
const logger = require("../../utils/logger");
const i18n = require("../../utils/i18n");

// 预设频道前缀 - 精美统一版本
const CHANNEL_PREFIX = "┖私人┃ ";
// 配置文件路径
const CONFIG_FILE_PATH = path.join(__dirname, "../../JSON/voiceChannelConfig.json");

// 读取语音频道配置
function loadVoiceChannelConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE_PATH)) {
            const data = fs.readFileSync(CONFIG_FILE_PATH, "utf8");
            return JSON.parse(data);
        }
    } catch (error) {
        logger.error(`无法读取语音频道配置：${error.message}`);
    }
    
    // 默认配置
    return {
        enabled: false,
        serverConfigs: {}
    };
}

// 保存语音频道配置
function saveVoiceChannelConfig(configData) {
    try {
        fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(configData, null, 2), "utf8");
    } catch (error) {
        logger.error(`无法保存语音频道配置：${error.message}`);
        throw error;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("voicechannel")
        .setNameLocalizations({
            "zh-CN": "voicechannel",
            "zh-TW": "voicechannel"
        })
        .setDescription("Manage auto-created private voice channels")
        .setDescriptionLocalizations({
            "zh-CN": "管理自动创建私人语音频道功能",
            "zh-TW": "管理自動創建私人語音頻道功能"
        })
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels) // 仅限管理频道权限
        .addSubcommand(subcommand => 
            subcommand
                .setName("set")
                .setDescription("Set up the auto-creation of private voice channels")
                .setDescriptionLocalizations({
                    "zh-CN": "设置自动创建私人语音频道",
                    "zh-TW": "設置自動創建私人語音頻道"
                })
                .addChannelOption(option => 
                    option
                        .setName("channel")
                        .setDescription("Select the source voice channel")
                        .setDescriptionLocalizations({
                            "zh-CN": "选择源语音频道",
                            "zh-TW": "選擇源語音頻道"
                        })
                        .addChannelTypes(2) // 2 = GUILD_VOICE
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("template")
                        .setDescription("Set the channel name template, variables: {username}, {count}")
                        .setDescriptionLocalizations({
                            "zh-CN": "设置频道名称模板，变量：{username}、{count}",
                            "zh-TW": "設置頻道名稱模板，變數：{username}、{count}"
                        })
                        .setRequired(false)
                )
                .addIntegerOption(option =>
                    option
                        .setName("userlimit")
                        .setDescription("Set the default user limit for the new channel (0 means no limit)")
                        .setDescriptionLocalizations({
                            "zh-CN": "设置新频道的默认用户限制（0表示无限制）",
                            "zh-TW": "設置新頻道的默認用戶限制（0表示無限制）"
                        })
                        .setRequired(false)
                        .setMinValue(0)
                        .setMaxValue(99)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("disable")
                .setDescription("Disable the auto-creation of private voice channels")
                .setDescriptionLocalizations({
                    "zh-CN": "禁用自动创建私人语音频道功能",
                    "zh-TW": "禁用自動創建私人語音頻道功能"
                })
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("status")
                .setDescription("Check the status of the auto-creation of private voice channels")
                .setDescriptionLocalizations({
                    "zh-CN": "检查自动创建私人语音频道功能的当前状态",
                    "zh-TW": "檢查自動創建私人語音頻道功能的當前狀態"
                })
        ),
    async execute(interaction) {
        // 只允许有管理频道权限的用户使用此命令
        const guildId = interaction.guild.id;
        const language = i18n.getServerLanguage(guildId);
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({
                content: i18n.getString("commands.voicechannel.noPermission", language),
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            // 读取当前配置
            const voiceConfig = loadVoiceChannelConfig();
            const embed = new EmbedBuilder().setColor(config.embedColour);

            switch (subcommand) {
                case "set":
                    const channel = interaction.options.getChannel("channel");
                    const template = interaction.options.getString("template") || "{username}";
                    const userLimit = interaction.options.getInteger("userlimit") || 0;
                
                    // 检查是否是语音频道
                    if (channel.type !== 2) {
                        return interaction.reply({
                            content: i18n.getString("commands.voicechannel.notVoiceChannel", language),
                            ephemeral: true
                        });
                    }
                
                    // 启用功能并设置源频道
                    voiceConfig.enabled = true;
                    voiceConfig.serverConfigs[guildId] = {
                        sourceChannelId: channel.id,
                        namePrefix: CHANNEL_PREFIX,
                        nameTemplate: template,
                        defaultUserLimit: userLimit
                    };
                
                    // 储存配置
                    saveVoiceChannelConfig(voiceConfig);
                
                    embed
                        .setTitle(i18n.getString("commands.voicechannel.setupSuccess.title", language))
                        .setDescription(i18n.getString("commands.voicechannel.setupSuccess.description", language, { channelName: channel.name }))
                        .addFields(
                            { name: i18n.getString("commands.voicechannel.channelStyle", language), value: `${CHANNEL_PREFIX}${template}`, inline: true },
                            { name: i18n.getString("commands.voicechannel.defaultUserLimit", language), 
                              value: userLimit > 0 ? userLimit.toString() : i18n.getString("commands.voicechannel.noLimit", language), 
                              inline: true }
                        );
                                    
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                    
                case "disable":
                    // 如果该服务器有配置，删除它
                    if (voiceConfig.serverConfigs[guildId]) {
                        delete voiceConfig.serverConfigs[guildId];
                    }

                    // 如果没有服务器配置了，禁用整个功能
                    if (Object.keys(voiceConfig.serverConfigs).length === 0) {
                        voiceConfig.enabled = false;
                    }

                    // 储存配置
                    saveVoiceChannelConfig(voiceConfig);

                    embed
                        .setTitle(i18n.getString("commands.voicechannel.disableSuccess.title", language))
                        .setDescription(i18n.getString("commands.voicechannel.disableSuccess.description", language));
                                        
                    return interaction.reply({ embeds: [embed], ephemeral: true });

                case "status":
                    const serverConfig = voiceConfig.serverConfigs[guildId];
                    
                    if (!serverConfig) {
                        embed
                            .setTitle(i18n.getString("commands.voicechannel.status.title", language))
                            .setDescription(i18n.getString("commands.voicechannel.status.disabled", language));
                    } else {
                        const sourceChannel = interaction.guild.channels.cache.get(serverConfig.sourceChannelId);
                        const template = serverConfig.nameTemplate || "{username}";
                        
                        embed
                            .setTitle(i18n.getString("commands.voicechannel.status.title", language))
                            .setDescription(i18n.getString("commands.voicechannel.status.enabled", language))
                            .addFields(
                                { name: i18n.getString("commands.voicechannel.sourceChannel", language), 
                                  value: sourceChannel ? sourceChannel.name : i18n.getString("commands.voicechannel.channelNotFound", language), 
                                  inline: true },
                                { name: i18n.getString("commands.voicechannel.channelStyle", language), 
                                  value: `${CHANNEL_PREFIX}${template}`, 
                                  inline: true },
                                { name: i18n.getString("commands.voicechannel.defaultUserLimit", language), 
                                  value: serverConfig.defaultUserLimit > 0 ? 
                                    serverConfig.defaultUserLimit.toString() : 
                                    i18n.getString("commands.voicechannel.noLimit", language), 
                                  inline: true }
                            );
                    }
                    
                    return interaction.reply({ embeds: [embed], ephemeral: true });
            }
        } catch (error) {
            logger.error(`设置自动创建私人语音频道功能时出错：${error.message}`);
            return interaction.reply({
                content: i18n.getString("commands.voicechannel.error", language, { errorMessage: error.message }),
                ephemeral: true
            });
        }
    },
};