const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { EmbedBuilder } = require("discord.js");
const config = require("../../config");
const logger = require("../../utils/logger");
const mongoose = require("mongoose");
const LogChannel = mongoose.model("LogChannel");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("log")
        .setDescription("設定日誌功能")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels) // 僅限管理頻道權限
        .addSubcommand(subcommand =>
            subcommand
                .setName("設定")
                .setDescription("設定日誌頻道")
                .addChannelOption(option =>
                    option
                        .setName("頻道")
                        .setDescription("選擇一個頻道接收日誌訊息")
                        .setRequired(true)
                )
                .addBooleanOption(option =>
                    option
                        .setName("訊息日誌")
                        .setDescription("記錄訊息刪除、編輯等事件")
                        .setRequired(false)
                )
                .addBooleanOption(option =>
                    option
                        .setName("語音日誌")
                        .setDescription("記錄語音頻道活動")
                        .setRequired(false)
                )
                .addBooleanOption(option =>
                    option
                        .setName("成員日誌")
                        .setDescription("記錄成員加入、離開等事件")
                        .setRequired(false)
                )
                .addBooleanOption(option =>
                    option
                        .setName("伺服器日誌")
                        .setDescription("記錄伺服器設定變更等事件")
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("關閉")
                .setDescription("關閉日誌功能")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("狀態")
                .setDescription("查看目前日誌功能設定")
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        try {
            if (subcommand === "設定") {
                const channel = interaction.options.getChannel("頻道");
                const messageLog = interaction.options.getBoolean("訊息日誌") ?? true;
                const voiceLog = interaction.options.getBoolean("語音日誌") ?? false;
                const memberLog = interaction.options.getBoolean("成員日誌") ?? false;
                const serverLog = interaction.options.getBoolean("伺服器日誌") ?? false;

                // 檢查頻道權限
                const permissions = channel.permissionsFor(interaction.guild.members.me);
                if (!permissions.has(PermissionFlagsBits.SendMessages) || 
                    !permissions.has(PermissionFlagsBits.EmbedLinks)) {
                    return await interaction.reply({
                        content: `⚠️ 我需要在 ${channel} 频道有發送訊息和嵌入連結的權限才能發送日誌。`,
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
                    .setTitle("✅ 日誌功能已設定")
                    .setDescription(`日誌將發送至 ${channel}`)
                    .addFields(
                        { name: "訊息日誌", value: messageLog ? "✅ 啟用" : "❌ 禁用", inline: true },
                        { name: "語音日誌", value: voiceLog ? "✅ 啟用" : "❌ 禁用", inline: true },
                        { name: "成員日誌", value: memberLog ? "✅ 啟用" : "❌ 禁用", inline: true },
                        { name: "伺服器日誌", value: serverLog ? "✅ 啟用" : "❌ 禁用", inline: true }
                    )
                    .setColor(config.embedColour)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
                logger.info(`${interaction.user.tag} 在伺服器 ${interaction.guild.name} (${guildId}) 設定了日誌功能`);

                // 發送測試訊息到指定頻道
                const testEmbed = new EmbedBuilder()
                    .setTitle("📝 日誌系統已啟用")
                    .setDescription("這是一條測試訊息，表示日誌系統已成功設定。")
                    .setColor(config.embedColour)
                    .setTimestamp();

                await channel.send({ embeds: [testEmbed] });

            } else if (subcommand === "關閉") {
                // 刪除日誌設定
                const result = await LogChannel.findOneAndDelete({ guildId });

                if (result) {
                    await interaction.reply({
                        content: "✅ 日誌功能已關閉",
                        ephemeral: true
                    });
                } else {
                    await interaction.reply({
                        content: "❓ 此伺服器尚未設定日誌功能",
                        ephemeral: true
                    });
                }

            } else if (subcommand === "狀態") {
                // 獲取日誌設定
                const logSettings = await LogChannel.findOne({ guildId });

                if (logSettings) {
                    const channel = interaction.guild.channels.cache.get(logSettings.channelId);
                    const channelMention = channel ? `<#${logSettings.channelId}>` : "找不到頻道";

                    const embed = new EmbedBuilder()
                        .setTitle("📝 日誌功能狀態")
                        .setDescription(`目前日誌頻道: ${channelMention}`)
                        .addFields(
                            { name: "訊息日誌", value: logSettings.logTypes.message ? "✅ 啟用" : "❌ 禁用", inline: true },
                            { name: "語音日誌", value: logSettings.logTypes.voice ? "✅ 啟用" : "❌ 禁用", inline: true },
                            { name: "成員日誌", value: logSettings.logTypes.member ? "✅ 啟用" : "❌ 禁用", inline: true },
                            { name: "伺服器日誌", value: logSettings.logTypes.server ? "✅ 啟用" : "❌ 禁用", inline: true }
                        )
                        .setColor(config.embedColour)
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed] });
                } else {
                    await interaction.reply({
                        content: "❓ 此伺服器尚未設定日誌功能",
                        ephemeral: true
                    });
                }
            }
        } catch (error) {
            logger.error(`執行日誌命令時出錯: ${error}`);
            await interaction.reply({
                content: "❌ 設定日誌功能時發生錯誤，請稍後再試或聯繫管理員。",
                ephemeral: true
            });
        }
    }
};
