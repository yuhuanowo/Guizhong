const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { v4: uuidv4 } = require("uuid");
const logger = require("../../utils/logger.js");
const i18n = require("../../utils/i18n");

// 导入Start命令以访问会话管理功能及相关模块
const startCommand = require("./Start");
const llmService = require("./utils/llmService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sessions")
    .setNameLocalizations({
      "zh-CN": "sessions",
      "zh-TW": "sessions"
    })
    .setDescription("Manage active AI chat sessions")
    .setDescriptionLocalizations({
      "zh-CN": "管理活跃的AI聊天会话",
      "zh-TW": "管理活躍的AI聊天會話"
    })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageThreads)
    .addSubcommand(subcommand =>
      subcommand
        .setName("list")
        .setDescription("List all active AI chat sessions")
        .setDescriptionLocalizations({
          "zh-CN": "列出所有活跃的AI聊天会话",
          "zh-TW": "列出所有活躍的AI聊天會話"
        })
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("stats")
        .setDescription("Show statistics about AI chat sessions")
        .setDescriptionLocalizations({
          "zh-CN": "显示AI聊天会话统计信息",
          "zh-TW": "顯示AI聊天會話統計資訊"
        })
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("cleanup")
        .setDescription("Clean up expired sessions")
        .setDescriptionLocalizations({
          "zh-CN": "清理过期的会话",
          "zh-TW": "清理過期的會話"
        })
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("end")
        .setDescription("Force end a specific session")
        .setDescriptionLocalizations({
          "zh-CN": "强制结束指定会话",
          "zh-TW": "強制結束指定會話"
        })
        .addStringOption(option =>
          option
            .setName("thread_id")
            .setDescription("The thread ID of the session to end")
            .setDescriptionLocalizations({
              "zh-CN": "要结束的会话线程ID",
              "zh-TW": "要結束的會話討論串ID"
            })
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const language = i18n.getServerLanguage(guildId);

    try {
      switch (subcommand) {
        case "list":
          await this.listSessions(interaction, language);
          break;
        case "stats":
          await this.showStats(interaction, language);
          break;
        case "cleanup":
          await this.cleanupSessions(interaction, language);
          break;
        case "end":
          await this.endSession(interaction, language);
          break;
        default:
          await interaction.reply({
            content: i18n.getString("commands.sessions.unknownSubcommand", language),
            ephemeral: true
          });
      }
    } catch (error) {
      logger.error("Sessions command error:", error);
      const errorEmbed = new EmbedBuilder()
        .setTitle(i18n.getString("commands.sessions.error", language))
        .setDescription(i18n.getString("commands.sessions.errorOccurred", language, { error: error.message }))
        .setColor("#ff0000");

      try {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      } catch (replyError) {
        logger.error("Reply error:", replyError);
      }
    }
  },

  async listSessions(interaction, language) {
    const sessions = startCommand.getAllActiveSessions();
    
    if (sessions.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle(i18n.getString("commands.sessions.listTitle", language))
        .setDescription(i18n.getString("commands.sessions.noActiveSessions", language))
        .setColor("#5865F2");
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(i18n.getString("commands.sessions.listTitle", language))
      .setDescription(i18n.getString("commands.sessions.foundSessions", language, { count: sessions.length }))
      .setColor("#5865F2")
      .setTimestamp();

    // 限制显示最多10个会话
    const displaySessions = sessions.slice(0, 10);
    
    for (const session of displaySessions) {
      const messageCount = Math.floor(session.messages.length / 2);
      const lastActivity = Math.floor(session.lastActivity.getTime() / 1000);
      const threadLink = `<#${session.threadId}>`;
      
      // 获取模型的友好名称和提供商
      const modelInfo = getModelDisplayInfo(session.model);
      
      embed.addFields({
        name: `🧵 ${threadLink}`,
        value: i18n.getString("commands.sessions.sessionInfo", language, {
          model: modelInfo.displayName,
          userId: session.userId,
          messageCount: messageCount,
          lastActivity: lastActivity,
          searchStatus: session.enableSearch ? 
            i18n.getString("commands.sessions.enabled", language) : 
            i18n.getString("commands.sessions.disabled", language)
        }),
        inline: true
      });
    }

    if (sessions.length > 10) {
      embed.setFooter({
        text: i18n.getString("commands.sessions.showingFirst", language, { 
          shown: 10, 
          total: sessions.length 
        })
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },

  async showStats(interaction, language) {
    const stats = startCommand.getSessionStats();
    
    const embed = new EmbedBuilder()
      .setTitle(i18n.getString("commands.sessions.statsTitle", language))
      .addFields(
        {
          name: i18n.getString("commands.sessions.generalStats", language),
          value: i18n.getString("commands.sessions.generalStatsValue", language, {
            totalSessions: stats.totalSessions,
            activeSessions: stats.activeSessions,
            searchEnabledSessions: stats.searchEnabledSessions
          }),
          inline: true
        },
        {
          name: i18n.getString("commands.sessions.usageStats", language),
          value: i18n.getString("commands.sessions.averageMessages", language, {
            average: stats.averageMessageCount.toFixed(1)
          }),
          inline: true
        }
      )
      .setColor("#5865F2")
      .setTimestamp();

    // 按提供商分组显示模型使用统计
    if (Object.keys(stats.modelUsage).length > 0) {
      // 按提供商分组统计
      const providerStats = {};
      
      Object.entries(stats.modelUsage).forEach(([model, count]) => {
        const modelInfo = getModelDisplayInfo(model);
        // 使用模型的类别前缀作为分组
        const modelName = modelInfo.displayName;
        const prefixMatch = modelName.match(/\[([^\]]+)\]/);
        const categoryName = prefixMatch ? prefixMatch[1] : i18n.getString("commands.sessions.other", language);
        
        if (!providerStats[categoryName]) {
          providerStats[categoryName] = [];
        }
        
        providerStats[categoryName].push({
          displayName: modelInfo.displayName,
          count: count
        });
      });
      
      // 构建每个提供商的使用统计
      Object.entries(providerStats).forEach(([category, models]) => {
        const modelsText = models
          .map(m => `**${m.displayName}**: ${m.count}`)
          .join('\n');
        
        embed.addFields({
          name: i18n.getString("commands.sessions.modelCategory", language, { category: category }),
          value: modelsText,
          inline: false
        });
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },

  async cleanupSessions(interaction, language) {
    const cleanedCount = startCommand.cleanupExpiredSessions();
    
    const embed = new EmbedBuilder()
      .setTitle(i18n.getString("commands.sessions.cleanupTitle", language))
      .setDescription(i18n.getString("commands.sessions.cleanedCount", language, { count: cleanedCount }))
      .setColor(cleanedCount > 0 ? "#00ff00" : "#5865F2")
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },

  async endSession(interaction, language) {
    const threadId = interaction.options.getString("thread_id");
    const session = startCommand.getActiveSession(threadId);
    
    if (!session) {
      const embed = new EmbedBuilder()
        .setTitle(i18n.getString("commands.sessions.sessionNotFound", language))
        .setDescription(i18n.getString("commands.sessions.sessionNotFoundDesc", language, { threadId: threadId }))
        .setColor("#ff0000");
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // 检查用户权限
    const isAdmin = interaction.member.permissions.has("ADMINISTRATOR") || 
                   interaction.member.permissions.has("MANAGE_GUILD");
    const userId = interaction.user.id;
    
    // 结束会话，传递用户ID和管理员权限
    const result = await startCommand.endSession(threadId, interaction.client, false, userId, isAdmin);
    
    if (result.success) {
      const modelInfo = getModelDisplayInfo(session.model);
      
      const embed = new EmbedBuilder()
        .setTitle(i18n.getString("commands.sessions.sessionEnded", language))
        .setDescription(i18n.getString("commands.sessions.sessionEndedDesc", language, { threadId: threadId }))
        .addFields(
          {
            name: i18n.getString("commands.sessions.sessionDetails", language),
            value: i18n.getString("commands.sessions.sessionDetailsValue", language, {
              userId: session.userId,
              model: modelInfo.displayName,
              createdAt: Math.floor(session.createdAt.getTime() / 1000)
            }),
            inline: false
          }
        )
        .setColor("#00ff00")
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });

      // 尝试在线程中发送结束通知
      try {
        const channel = await interaction.client.channels.fetch(threadId);
        if (channel && channel.isThread()) {
          const modelInfo = getModelDisplayInfo(session.model);
          
          const endEmbed = new EmbedBuilder()
            .setTitle(i18n.getString("commands.sessions.sessionEndedByAdmin", language))
            .setDescription(i18n.getString("commands.sessions.sessionEndedByAdminDesc", language))
            .setColor("#ff9900")
            .addFields({
              name: i18n.getString("commands.sessions.sessionSummary", language),
              value: i18n.getString("commands.sessions.sessionSummaryValue", language, {
                model: modelInfo.displayName,
                messageCount: Math.floor(session.messages.length / 2),
                createdAt: Math.floor(session.createdAt.getTime() / 1000)
              }),
              inline: false
            })
            .setTimestamp();

          await channel.send({ embeds: [endEmbed] });

          // 归档线程
          setTimeout(async () => {
            try {
              await channel.setArchived(true);
            } catch (archiveError) {
              logger.error("Error archiving thread:", archiveError);
            }
          }, 3000);
        }
      } catch (channelError) {
        logger.error("Error notifying thread:", channelError);
      }
    } else {
      const embed = new EmbedBuilder()
        .setTitle(i18n.getString("commands.sessions.failedToEndSession", language))
        .setDescription(i18n.getString("commands.sessions.failedToEndSessionDesc", language))
        .setColor("#ff0000");
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};

/**
 * 获取模型的友好显示名称
 * 直接调用llmService中的方法
 * @param {string} modelName 模型名称
 * @returns {string} 模型的友好显示名称
 */
function getModelDisplayInfo(modelName) {
  // 查找模型的友好名称
  let displayName = modelName;
  const allModels = llmService.getAllAvailableModels();
  
  const modelInfo = allModels.find(m => m.value === modelName);
  if (modelInfo) {
    displayName = modelInfo.name;
  }
  
  return {
    displayName
  };
}
