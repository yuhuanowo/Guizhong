const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { EmbedBuilder } = require("discord.js");
const config = require("../../config");
const fs = require("node:fs");
const path = require("node:path");
const logger = require("../../utils/logger");

// 預設頻道前綴 - 精美統一版本
const CHANNEL_PREFIX = "┖私人┃ ";
// 配置文件路径
const CONFIG_FILE_PATH = path.join(__dirname, "../../JSON/voiceChannelConfig.json");

// 讀取語音頻道配置
function loadVoiceChannelConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE_PATH)) {
            const data = fs.readFileSync(CONFIG_FILE_PATH, "utf8");
            return JSON.parse(data);
        }
    } catch (error) {
        logger.error(`無法讀取語音頻道配置：${error.message}`);
    }
    
    // 默認配置
    return {
        enabled: false,
        serverConfigs: {}
    };
}

// 保存語音頻道配置
function saveVoiceChannelConfig(configData) {
    try {
        fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(configData, null, 2), "utf8");
    } catch (error) {
        logger.error(`無法保存語音頻道配置：${error.message}`);
        throw error;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("voicechannel")
        .setDescription("管理自動創建私人語音頻道功能")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels) // 僅限管理頻道權限
        .addSubcommand(subcommand => 
            subcommand
                .setName("set")
                .setDescription("設置自動創建私人語音頻道的源頻道")
                .addChannelOption(option => 
                    option
                        .setName("channel")
                        .setDescription("選擇一個語音頻道作為源頻道")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("template")
                        .setDescription("設置頻道名稱模板，可用變數: {username}, {count}")
                        .setRequired(false)
                )
                .addIntegerOption(option =>
                    option
                        .setName("userlimit")
                        .setDescription("設置新創建頻道的默認人數上限 (0表示無限制)")
                        .setRequired(false)
                        .setMinValue(0)
                        .setMaxValue(99)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("disable")
                .setDescription("禁用自動創建私人語音頻道功能")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("status")
                .setDescription("檢查自動創建私人語音頻道功能的當前狀態")
        ),    
    async execute(interaction) {
        // 只允許有管理頻道權限的用戶使用此命令
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({
                content: "您沒有權限使用此命令。需要管理頻道權限。",
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            // 讀取當前配置
            const voiceConfig = loadVoiceChannelConfig();
            const guildId = interaction.guild.id;
            const embed = new EmbedBuilder().setColor(config.embedColour);

            switch (subcommand) {
                case "set":
                    const channel = interaction.options.getChannel("channel");
                    const template = interaction.options.getString("template") || "{username}";
                    const userLimit = interaction.options.getInteger("userlimit") || 0;
                
                    // 檢查是否是語音頻道
                    if (channel.type !== 2) {
                        return interaction.reply({
                            content: "請選擇一個語音頻道。",
                            ephemeral: true
                        });
                    }
                
                    // 啟用功能並設置源頻道
                    voiceConfig.enabled = true;
                    voiceConfig.serverConfigs[guildId] = {
                        sourceChannelId: channel.id,
                        namePrefix: CHANNEL_PREFIX,
                        nameTemplate: template,
                        defaultUserLimit: userLimit
                    };
                
                    // 儲存配置
                    saveVoiceChannelConfig(voiceConfig);
                
                    embed
                        .setTitle("✅ 自動創建私人語音頻道功能已設置")
                        .setDescription(`已將 ${channel.name} 設置為源頻道。當用戶加入此頻道時，將自動創建私人語音頻道。`)
                        .addFields(
                            { name: "頻道樣式", value: `${CHANNEL_PREFIX}${template}`, inline: true },
                            { name: "默認人數上限", value: userLimit > 0 ? userLimit.toString() : "無限制", inline: true }
                        );
                                    
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                    
                case "disable":
                    // 如果該伺服器有配置，刪除它
                    if (voiceConfig.serverConfigs[guildId]) {
                        delete voiceConfig.serverConfigs[guildId];
                    }

                    // 如果沒有伺服器配置了，禁用整個功能
                    if (Object.keys(voiceConfig.serverConfigs).length === 0) {
                        voiceConfig.enabled = false;
                    }

                    // 儲存配置
                    saveVoiceChannelConfig(voiceConfig);

                    embed
                        .setTitle("❌ 自動創建私人語音頻道功能已禁用")
                        .setDescription("此伺服器的自動創建私人語音頻道功能已禁用。");
                                        
                    return interaction.reply({ embeds: [embed], ephemeral: true });

                case "status":
                    const serverConfig = voiceConfig.serverConfigs[guildId];
                    
                    if (!serverConfig) {
                        embed
                            .setTitle("📊 自動創建私人語音頻道功能狀態")
                            .setDescription("此伺服器未啟用自動創建私人語音頻道功能。");
                    } else {
                        const sourceChannel = interaction.guild.channels.cache.get(serverConfig.sourceChannelId);
                        const template = serverConfig.nameTemplate || "{username}";
                        
                        embed
                            .setTitle("📊 自動創建私人語音頻道功能狀態")
                            .setDescription("此伺服器已啟用自動創建私人語音頻道功能。")
                            .addFields(
                                { name: "源頻道", value: sourceChannel ? sourceChannel.name : "未找到頻道（可能已被刪除）", inline: true },
                                { name: "頻道樣式", value: `${CHANNEL_PREFIX}${template}`, inline: true },
                                { name: "默認人數上限", value: serverConfig.defaultUserLimit > 0 ? serverConfig.defaultUserLimit.toString() : "無限制", inline: true }
                            );
                    }
                    
                    return interaction.reply({ embeds: [embed], ephemeral: true });
            }
        } catch (error) {
            logger.error(`設置自動創建私人語音頻道功能時出錯：${error.message}`);
            return interaction.reply({
                content: `設置自動創建私人語音頻道功能時出錯：${error.message}`,
                ephemeral: true
            });
        }
    },
};