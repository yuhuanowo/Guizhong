const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { EmbedBuilder } = require("discord.js");
const config = require("../../config");
const logger = require("../../utils/logger");
const mongoose = require("mongoose");
const LogChannel = mongoose.model("LogChannel");
const i18n = require("../../utils/i18n");
module.exports = {
    data: new SlashCommandBuilder()        .setName("log")
        .setNameLocalizations({
            "zh-CN": "log",
            "zh-TW": "log"
        })
        .setDescription("Set up server logs")
        .setDescriptionLocalizations({
            "zh-CN": "设置服务器日志",
            "zh-TW": "設定日誌功能"
        })
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels) // 僅限管理頻道權限        
        .addSubcommand(subcommand =>
            subcommand
                .setName("set")
                .setNameLocalizations({
                    "zh-CN": "设定",
                    "zh-TW": "設定"
                })
                .setDescription("Set log channel")
                .setDescriptionLocalizations({
                    "zh-CN": "设定日志频道",
                    "zh-TW": "設定日誌頻道"
                })
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setNameLocalizations({
                            "zh-CN": "频道",
                            "zh-TW": "頻道"
                        })
                        .setDescription("Select a channel to receive log messages")
                        .setDescriptionLocalizations({
                            "zh-CN": "选择一个接收日志信息的频道",
                            "zh-TW": "選擇一個頻道接收日誌訊息"
                        })
                        .setRequired(true)
                )
                .addBooleanOption(option =>
                    option
                        .setName("message_log")
                        .setNameLocalizations({
                            "zh-CN": "消息日志",
                            "zh-TW": "訊息日誌"
                        })
                        .setDescription("Log message deletion, edits, and other message events")
                        .setDescriptionLocalizations({
                            "zh-CN": "记录消息删除、编辑等事件",
                            "zh-TW": "記錄訊息刪除、編輯等事件"
                        })
                        .setRequired(false)
                )
                .addBooleanOption(option =>
                    option
                        .setName("voice_log")
                        .setNameLocalizations({
                            "zh-CN": "语音日志",
                            "zh-TW": "語音日誌"
                        })
                        .setDescription("Log voice channel activity")
                        .setDescriptionLocalizations({
                            "zh-CN": "记录语音频道活动",
                            "zh-TW": "記錄語音頻道活動"
                        })
                        .setRequired(false)
                )
                .addBooleanOption(option =>
                    option
                        .setName("member_log")
                        .setNameLocalizations({
                            "zh-CN": "成员日志",
                            "zh-TW": "成員日誌"
                        })
                        .setDescription("Log member join, leave, and other membership events")
                        .setDescriptionLocalizations({
                            "zh-CN": "记录成员加入、离开等事件",
                            "zh-TW": "記錄成員加入、離開等事件"
                        })
                        .setRequired(false)
                )
                .addBooleanOption(option =>
                    option
                        .setName("server_log")
                        .setNameLocalizations({
                            "zh-CN": "服务器日志",
                            "zh-TW": "伺服器日誌"
                        })
                        .setDescription("Log server setting changes and other server events")
                        .setDescriptionLocalizations({
                            "zh-CN": "记录服务器设置变更等事件",
                            "zh-TW": "記錄伺服器設定變更等事件"
                        })
                        .setRequired(false)
                )
        )        .addSubcommand(subcommand =>
            subcommand
                .setName("disable")
                .setNameLocalizations({
                    "zh-CN": "关闭",
                    "zh-TW": "關閉"
                })
                .setDescription("Disable log feature")
                .setDescriptionLocalizations({
                    "zh-CN": "关闭日志功能",
                    "zh-TW": "關閉日誌功能"
                })
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("status")
                .setNameLocalizations({
                    "zh-CN": "状态",
                    "zh-TW": "狀態"
                })
                .setDescription("Check log status")
                .setDescriptionLocalizations({
                    "zh-CN": "查看当前日志功能设置",
                    "zh-TW": "查看目前日誌功能設定"
                })
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        const language = interaction.locale || "en";

        try {
            if (subcommand === "set" || subcommand === "設定" || subcommand === "设定") {
                const channel = interaction.options.getChannel("channel");
                const messageLog = interaction.options.getBoolean("message_log");
                const voiceLog = interaction.options.getBoolean("voice_log");
                const memberLog = interaction.options.getBoolean("member_log");
                const serverLog = interaction.options.getBoolean("server_log");
                const guild = interaction.guild;
                const language = i18n.getServerLanguage(guildId);
                // 检查频道权限
                const permissions = channel.permissionsFor(interaction.guild.members.me);
                if (!permissions.has(PermissionFlagsBits.SendMessages) ||
                    !permissions.has(PermissionFlagsBits.EmbedLinks)) {
                    return await interaction.reply({
                        content: i18n.getString("commands.log.set.missingPermissions", language, { channel: channel }),
                        ephemeral: true
                    });
                }

                // 更新或創建日誌設定
                const logSettings = await LogChannel.findOneAndUpdate(
                    { guildId },
                    {
                        guildId,
                        channelId: channel.id,
                        logTypes: {
                            message: messageLog,
                            voice: voiceLog,
                            member: memberLog,
                            server: serverLog
                        }
                    },
                    { upsert: true, new: true }
                );
                const embed = new EmbedBuilder()
                    .setTitle(i18n.getString("commands.log.set.title", language))
                    .setDescription(i18n.getString("commands.log.set.description", language, { channel: channel }))
                    .addFields(
                        { 
                            name: i18n.getString("commands.general.logSettings.messageLog", language), 
                            value: messageLog ? i18n.getString("commands.general.logSettings.enabled", language) : i18n.getString("commands.general.logSettings.disabled", language), 
                            inline: true 
                        },
                        { 
                            name: i18n.getString("commands.general.logSettings.voiceLog", language), 
                            value: voiceLog ? i18n.getString("commands.general.logSettings.enabled", language) : i18n.getString("commands.general.logSettings.disabled", language), 
                            inline: true 
                        },
                        { 
                            name: i18n.getString("commands.general.logSettings.memberLog", language), 
                            value: memberLog ? i18n.getString("commands.general.logSettings.enabled", language) : i18n.getString("commands.general.logSettings.disabled", language), 
                            inline: true 
                        },
                        { 
                            name: i18n.getString("commands.general.logSettings.serverLog", language), 
                            value: serverLog ? i18n.getString("commands.general.logSettings.enabled", language) : i18n.getString("commands.general.logSettings.disabled", language), 
                            inline: true 
                        }
                    )
                    .setColor(config.embedColour)
                    .setTimestamp();                await interaction.reply({ embeds: [embed] });
                logger.info(i18n.getString("commands.general.logSettings.settingConfig", language, { 
                    user: interaction.user.tag, 
                    server: interaction.guild.name, 
                    id: guildId 
                }));

                // 发送测试消息到指定频道
                const testEmbed = new EmbedBuilder()
                    .setTitle(i18n.getString("commands.log.test.title", language))
                    .setDescription(i18n.getString("commands.log.test.description", language))
                    .setColor(config.embedColour)
                    .setTimestamp();

                await channel.send({ embeds: [testEmbed] });            } else if (subcommand === "disable" || subcommand === "關閉" || subcommand === "关闭") {
                // 删除日志设置
                const result = await LogChannel.findOneAndDelete({ guildId });

                if (result) {
                    await interaction.reply({
                        content: i18n.getString("commands.log.disable.success", language),
                        ephemeral: true
                    });
                } else {
                    await interaction.reply({
                        content: i18n.getString("commands.log.disable.notConfigured", language),
                        ephemeral: true
                    });
                }            } else if (subcommand === "status" || subcommand === "狀態" || subcommand === "状态") {
                // 获取日志设置
                const logSettings = await LogChannel.findOne({ guildId });

                if (logSettings) {
                    const channel = interaction.guild.channels.cache.get(logSettings.channelId);
                    const channelMention = channel ? `<#${logSettings.channelId}>` : i18n.getString("commands.log.status.channelNotFound", language);

                    const embed = new EmbedBuilder()
                        .setTitle(i18n.getString("commands.log.status.title", language))
                        .setDescription(i18n.getString("commands.log.status.description", language, { channelMention }))
                        .addFields(
                            { 
                                name: i18n.getString("commands.general.logSettings.messageLog", language), 
                                value: logSettings.logTypes.message ? i18n.getString("commands.general.logSettings.enabled", language) : i18n.getString("commands.general.logSettings.disabled", language), 
                                inline: true 
                            },
                            { 
                                name: i18n.getString("commands.general.logSettings.voiceLog", language), 
                                value: logSettings.logTypes.voice ? i18n.getString("commands.general.logSettings.enabled", language) : i18n.getString("commands.general.logSettings.disabled", language), 
                                inline: true 
                            },
                            { 
                                name: i18n.getString("commands.general.logSettings.memberLog", language), 
                                value: logSettings.logTypes.member ? i18n.getString("commands.general.logSettings.enabled", language) : i18n.getString("commands.general.logSettings.disabled", language), 
                                inline: true 
                            },
                            { 
                                name: i18n.getString("commands.general.logSettings.serverLog", language), 
                                value: logSettings.logTypes.server ? i18n.getString("commands.general.logSettings.enabled", language) : i18n.getString("commands.general.logSettings.disabled", language), 
                                inline: true 
                            }
                        )
                        .setColor(config.embedColour)
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed] });
                } else {
                    await interaction.reply({
                        content: i18n.getString("commands.log.status.notConfigured", language),
                        ephemeral: true
                    });
                }
            }        } catch (error) {
            logger.error(`執行日誌命令時出錯: ${error}`);
            await interaction.reply({
                content: i18n.getString("commands.log.error", language),
                ephemeral: true
            });
        }
    }
};
