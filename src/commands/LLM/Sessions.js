const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { v4: uuidv4 } = require("uuid");
const logger = require("../../utils/logger.js");
const i18n = require("../../utils/i18n");

// 导入Start命令以访问会话管理功能
const startCommand = require("./Start");

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
            content: "Unknown subcommand",
            ephemeral: true
          });
      }
    } catch (error) {
      logger.error("Sessions command error:", error);
      const errorEmbed = new EmbedBuilder()
        .setTitle("❌ Error")
        .setDescription(`An error occurred: ${error.message}`)
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
        .setTitle("📋 Active AI Chat Sessions")
        .setDescription("No active sessions found.")
        .setColor("#5865F2");
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("📋 Active AI Chat Sessions")
      .setDescription(`Found ${sessions.length} active session(s)`)
      .setColor("#5865F2")
      .setTimestamp();

    // 限制显示最多10个会话
    const displaySessions = sessions.slice(0, 10);
    
    for (const session of displaySessions) {
      const messageCount = Math.floor(session.messages.length / 2);
      const lastActivity = Math.floor(session.lastActivity.getTime() / 1000);
      const threadLink = `<#${session.threadId}>`;
      
      embed.addFields({
        name: `🧵 ${threadLink}`,
        value: `**Model**: ${session.model}\n**User**: <@${session.userId}>\n**Messages**: ${messageCount}\n**Last Activity**: <t:${lastActivity}:R>\n**Search**: ${session.enableSearch ? 'Enabled' : 'Disabled'}`,
        inline: true
      });
    }

    if (sessions.length > 10) {
      embed.setFooter({
        text: `Showing first 10 of ${sessions.length} sessions`
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },

  async showStats(interaction, language) {
    const stats = startCommand.getSessionStats();
    
    const embed = new EmbedBuilder()
      .setTitle("📊 AI Chat Session Statistics")
      .addFields(
        {
          name: "📈 General Stats",
          value: `**Total Sessions**: ${stats.totalSessions}\n**Active Sessions**: ${stats.activeSessions}\n**Search Enabled**: ${stats.searchEnabledSessions}`,
          inline: true
        },
        {
          name: "💬 Usage Stats",
          value: `**Average Messages**: ${stats.averageMessageCount.toFixed(1)}`,
          inline: true
        }
      )
      .setColor("#5865F2")
      .setTimestamp();

    // 添加模型使用统计
    if (Object.keys(stats.modelUsage).length > 0) {
      const modelStats = Object.entries(stats.modelUsage)
        .map(([model, count]) => `**${model}**: ${count}`)
        .join('\n');
      
      embed.addFields({
        name: "🤖 Model Usage",
        value: modelStats,
        inline: false
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },

  async cleanupSessions(interaction, language) {
    const cleanedCount = startCommand.cleanupExpiredSessions();
    
    const embed = new EmbedBuilder()
      .setTitle("🧹 Session Cleanup")
      .setDescription(`Cleaned up ${cleanedCount} expired session(s)`)
      .setColor(cleanedCount > 0 ? "#00ff00" : "#5865F2")
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },

  async endSession(interaction, language) {
    const threadId = interaction.options.getString("thread_id");
    const session = startCommand.getActiveSession(threadId);
    
    if (!session) {
      const embed = new EmbedBuilder()
        .setTitle("❌ Session Not Found")
        .setDescription(`No active session found for thread ID: ${threadId}`)
        .setColor("#ff0000");
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // 结束会话
    const success = startCommand.endSession(threadId);
    
    if (success) {
      const embed = new EmbedBuilder()
        .setTitle("✅ Session Ended")
        .setDescription(`Successfully ended session in <#${threadId}>`)
        .addFields(
          {
            name: "Session Details",
            value: `**User**: <@${session.userId}>\n**Model**: ${session.model}\n**Duration**: <t:${Math.floor(session.createdAt.getTime() / 1000)}:R>`,
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
          const endEmbed = new EmbedBuilder()
            .setTitle("🔚 Session Ended by Administrator")
            .setDescription("This AI chat session has been ended by an administrator.")
            .setColor("#ff9900")
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
        .setTitle("❌ Failed to End Session")
        .setDescription("Failed to end the session. It may have already been ended.")
        .setColor("#ff0000");
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};
