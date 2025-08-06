const { SlashCommandBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const { v4: uuidv4 } = require("uuid");
const logger = require("../../utils/logger.js");
const i18n = require("../../utils/i18n");
const config = require("../../config.js");

// 导入LLM相关模块
const memoryService = require("./utils/memoryService");
const llmService = require("./utils/llmService");
const toolFunctions = require("./utils/toolFunctions");
const { searchResultsCache } = require("../../buttons/showSearchResults");

// 存储活跃的聊天会话
const fs = require('fs');
const path = require('path');
const SESSIONS_FILE = path.resolve(__dirname, '../../../sessions.json');
let activeChatSessions = new Map();

// 从 JSON 文件加载会话
function loadSessionsFromFile() {
  if (fs.existsSync(SESSIONS_FILE)) {
    try {
      const data = fs.readFileSync(SESSIONS_FILE, 'utf-8');
      const sessionsArr = JSON.parse(data);
      activeChatSessions = new Map();
      for (const session of sessionsArr) {
        // 恢复 Date 类型
        session.createdAt = new Date(session.createdAt);
        session.lastActivity = new Date(session.lastActivity);
        activeChatSessions.set(session.threadId, session);
        // 重新计时自动清理
        scheduleSessionCleanup(session.threadId, session);
      }
      logger.info(`已从 sessions.json 恢复 ${activeChatSessions.size} 个会话`);
    } catch (e) {
      logger.error('加载 sessions.json 失败:', e);
    }
  }
}

// 保存会话到 JSON 文件
function saveSessionsToFile() {
  try {
    const sessionsArr = Array.from(activeChatSessions.values());
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessionsArr, null, 2), 'utf-8');
  } catch (e) {
    logger.error('保存 sessions.json 失败:', e);
  }
}

// 启动时加载会话
loadSessionsFromFile();

// 自动清理计时器 map
const sessionTimeouts = new Map();

function scheduleSessionCleanup(threadId, sessionData) {
  // 清除旧的计时器
  if (sessionTimeouts.has(threadId)) {
    clearTimeout(sessionTimeouts.get(threadId));
  }
  // 计算剩余时间
  const now = Date.now();
  const last = sessionData.lastActivity.getTime();
  const timeoutMs = Math.max(0, 24 * 60 * 60 * 1000 - (now - last));
  const timer = setTimeout(async () => {
    if (activeChatSessions.has(threadId)) {
      try {
        const threadChannel = await sessionData.client?.channels?.fetch(threadId).catch(() => null);
        if (threadChannel) {
          await threadChannel.delete(`聊天会话超时自动结束: ${threadChannel.name}`);
          logger.info(`聊天线程已删除: ${threadId}`);
        }
      } catch (deleteError) {
        logger.error(`删除线程失败: ${threadId}`, deleteError);
      }
      activeChatSessions.delete(threadId);
      saveSessionsToFile();
      sessionTimeouts.delete(threadId);
      logger.info(`聊天会话已自动清理: ${threadId}`);
    }
  }, timeoutMs);
  sessionTimeouts.set(threadId, timer);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("start")
    .setNameLocalizations({
      "zh-CN": "start",
      "zh-TW": "start"
    })
    .setDescription("Start a continuous AI chat session")
    .setDescriptionLocalizations({
      "zh-CN": "开启连续AI聊天会话",
      "zh-TW": "開啟連續AI聊天會話"
    })
    .addStringOption((option) =>
      option
        .setName("model")
        .setDescription("Select AI model (default: gpt-4.1-nano)")
        .setDescriptionLocalizations({
          "zh-CN": "选择AI模型 (默认: gpt-4.1-nano)",
          "zh-TW": "選擇AI模型 (預設: gpt-4.1-nano)"
        })
        .setRequired(false)
        .addChoices(
          { name: "DeepSeek-R1", value: "DeepSeek-R1" },
          { name: "GPT-4.1", value: "gpt-4.1" },
          { name: "GPT-4.1-mini", value: "gpt-4.1-mini" },
          { name: "GPT-4.1-nano", value: "gpt-4.1-nano" },
          { name: "o3", value: "o3" },
          { name: "o4-mini", value: "o4-mini" },
          { name: "o3-mini", value: "o3-mini" },
          { name: "gpt4o", value: "gpt-4o" },
          { name: "gpt4o-mini", value: "gpt-4o-mini" },
          { name: "o1", value: "o1" },
          { name: "o1-mini", value: "o1-mini" },
          { name: "Cohere-command-r-08", value: "Cohere-command-r-08-2024" },
          { name: "Ministral-3B", value: "Ministral-3B" },
          { name: "DeepSeek-V3", value: "DeepSeek-V3-0324" },
          { name: "Ministral-small-3.1", value: "mistral-small-2503" }
        )
    )
    .addBooleanOption((option) =>
      option
        .setName("enable_search")
        .setDescription("Enable web search (default: no)")
        .setDescriptionLocalizations({
          "zh-CN": "是否启用联网搜索 (默认：否)",
          "zh-TW": "是否啟用聯網搜尋 (預設：否)"
        })
        .setRequired(false)
    )
    .addBooleanOption((option) =>
      option
        .setName("enable_systemprompt")
        .setDescription("Enable system prompt (default: yes)")
        .setDescriptionLocalizations({
          "zh-CN": "是否启用系统提示 (默认：是)",
          "zh-TW": "是否啟用系統提示 (預設：是)"
        })
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("title")
        .setDescription("Custom title for the chat session")
        .setDescriptionLocalizations({
          "zh-CN": "自定义聊天会话标题",
          "zh-TW": "自定義聊天會話標題"
        })
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("initial_prompt")
        .setDescription("Initial message to start the conversation")
        .setDescriptionLocalizations({
          "zh-CN": "用于开始对话的初始消息",
          "zh-TW": "用於開始對話的初始訊息"
        })
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("history")
        .setDescription("Load conversation history to continue previous chat")
        .setDescriptionLocalizations({
          "zh-CN": "加载对话历史以继续之前的聊天",
          "zh-TW": "載入對話歷史以繼續之前的聊天"
        })
        .setAutocomplete(true)
        .setRequired(false)
    )
    .addAttachmentOption((option) =>
      option
        .setName("image")
        .setDescription("Upload an image to analyze")
        .setDescriptionLocalizations({
          "zh-CN": "上传图片进行分析",
          "zh-TW": "上傳圖片進行分析"
        })
        .setRequired(false)
    )
    .addAttachmentOption((option) =>
      option
        .setName("audio")
        .setDescription("Upload audio to analyze")
        .setDescriptionLocalizations({
          "zh-CN": "上传音频进行分析",
          "zh-TW": "上傳音頻進行分析"
        })
        .setRequired(false)
    )
    .addAttachmentOption((option) =>
      option
        .setName("file")
        .setDescription("Upload a file to analyze")
        .setDescriptionLocalizations({
          "zh-CN": "上传文件进行分析",
          "zh-TW": "上傳檔案進行分析"
        })
        .setRequired(false)
    )
    .addBooleanOption((option) =>
      option
        .setName("auto_archive")
        .setDescription("Auto-archive thread after 1 hour of inactivity (default: true)")
        .setDescriptionLocalizations({
          "zh-CN": "1小时无活动后自动归档线程（默认：是）",
          "zh-TW": "1小時無活動後自動歸檔討論串（預設：是）"
        })
        .setRequired(false)
    )
    .addBooleanOption((option) =>
      option
        .setName("private_thread")
        .setDescription("Create a private thread (default: false)")
        .setDescriptionLocalizations({
          "zh-CN": "创建私有线程（默认：否）",
          "zh-TW": "建立私人討論串（預設：否）"
        })
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("max_messages")
        .setDescription("Maximum number of messages to remember (default: 20)")
        .setDescriptionLocalizations({
          "zh-CN": "记住的最大消息数量（默认：20）",
          "zh-TW": "記住的最大訊息數量（預設：20）"
        })
        .setMinValue(1)
        .setMaxValue(50)
        .setRequired(false)
    ),

  async autocompleteRun(interaction) {
    const guildId = interaction.guild.id;
    const language = i18n.getServerLanguage(guildId);
    try {
      const focusedValue = interaction.options.getFocused();

      function formatRelativeTime(timestamp) {
        const now = new Date().getTime();
        const recordTime = new Date(timestamp).getTime();
        const diffMs = now - recordTime;

        const diffMinutes = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) {
          return `${diffDays} days ago`;
        } else if (diffHours > 0) {
          return `${diffHours} hours ago`;
        } else if (diffMinutes > 0) {
          return `${diffMinutes} minutes ago`;
        }
        return "Just now";
      }

      // 使用MongoDB查询
      const searchQuery = focusedValue ? 
        { 
          user_id: interaction.user.id,
          prompt: { $regex: focusedValue, $options: 'i' }
        } : 
        { user_id: interaction.user.id };

      const mongoRows = await memoryService.ChatLog
        .find(searchQuery)
        .sort({ timestamp: -1 })
        .limit(25)
        .select('prompt timestamp interaction_id')
        .lean();

      const choices = mongoRows.map(row => {
        const displayPrompt =
          row.prompt.length > 50
            ? row.prompt.slice(0, 47) + "..."
            : row.prompt;
        const timeAgo = formatRelativeTime(row.timestamp);
        return {
          name: `💭 ${displayPrompt} (${timeAgo})`,
          // 确保interaction_id为字符串且不为空
          value: String(row.interaction_id || 'no_id')
        };
      }).filter(choice => choice.value && choice.value !== 'no_id');

      // 确保响应不超过25个选项
      await interaction.respond(choices.slice(0, 25));
    } catch (error) {
      console.error("Autocomplete 錯誤:", error);
      await interaction.respond([]);
    }
  },

  async execute(interaction) {
    // 延迟回复以防止超时
    await interaction.deferReply();

    let selectedModel = interaction.options.getString("model") || "gpt-4.1-nano";
    const enableSearch = interaction.options.getBoolean("enable_search") || false;
    const enableSystemPrompt = interaction.options.getBoolean("enable_systemprompt") !== false;
    const customTitle = interaction.options.getString("title");
    const initialPrompt = interaction.options.getString("initial_prompt");
    const historyId = interaction.options.getString("history");
    const image = interaction.options.getAttachment("image");
    const audio = interaction.options.getAttachment("audio");
    const file = interaction.options.getAttachment("file");
    const autoArchive = interaction.options.getBoolean("auto_archive") ?? true;
    const privateThread = interaction.options.getBoolean("private_thread") || false;
    const maxMessages = interaction.options.getInteger("max_messages") || 20;
    const guildId = interaction.guild.id;
    const language = i18n.getServerLanguage(guildId);

    // 生成会话ID
    const sessionId = uuidv4();

    try {
      // 检查用户使用限制
      const usageLimits = llmService.getModelUsageLimits();
      const usageInfo = llmService.updateUserUsage(interaction.user.id, selectedModel, usageLimits);
      selectedModel = usageInfo.selectedModel;

      if (usageInfo.isExceeded) {
        const embed = new EmbedBuilder()
          .setTitle("AI Chat Session")
          .setDescription(i18n.getString("commands.agent.usageExceeded", language, {
            limit: usageInfo.limit,
            usage: usageInfo.usage,
            model: selectedModel
          }))
          .setColor("#ff0000");
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // 创建线程标题
      const threadTitle = customTitle || 
        i18n.getString("commands.start.defaultTitle", language, {
          username: interaction.user.username,
          model: selectedModel
        });

      // 创建线程（公开或私有）
      const thread = await interaction.channel.threads.create({
        name: threadTitle,
        type: privateThread ? ChannelType.PrivateThread : ChannelType.PublicThread,
        autoArchiveDuration: autoArchive ? 60 : 1440, // 1小时或24小时
        reason: `AI Chat session started by ${interaction.user.tag}`,
        invitable: !privateThread // 私有线程不可邀请
      });

      // 准备初始消息历史
      let initialMessages = [];
      
      // 如果有历史ID，加载历史对话
      if (historyId) {
        try {
          const historyChat = await memoryService.getHistoryById(historyId, interaction.user.id);
          if (historyChat) {
            initialMessages.push({ role: "user", content: historyChat.prompt });
            initialMessages.push({ role: "assistant", content: historyChat.reply });
            logger.info(`加载历史对话: ${historyId}`);
          } else {
            logger.info(`找不到历史对话: ${historyId}`);
          }
        } catch (historyError) {
          logger.error("加载历史对话失败:", historyError);
        }
      }

      // 存储会话信息
      const sessionData = {
        sessionId,
        threadId: thread.id,
        userId: interaction.user.id,
        model: selectedModel,
        enableSearch,
        enableSystemPrompt,
        createdAt: new Date(),
        messages: initialMessages, // 存储对话历史（包含加载的历史）
        lastActivity: new Date(),
        maxMessages, // 最大消息记录数
        autoArchive, // 自动归档设置
        privateThread, // 是否为私有线程
        attachments: {
          hasInitialImage: !!image,
          hasInitialAudio: !!audio,
          hasInitialFile: !!file
        }
      };

      activeChatSessions.set(thread.id, sessionData);
      saveSessionsToFile();
      // 记录 client 用于重启后清理
      sessionData.client = interaction.client;
      scheduleSessionCleanup(thread.id, sessionData);

      // 创建欢迎消息
      const welcomeEmbed = new EmbedBuilder()
        .setTitle(i18n.getString("commands.start.sessionStarted", language))
        .setDescription(i18n.getString("commands.start.welcomeMessage", language, {
          model: selectedModel,
          search: enableSearch ? 
            i18n.getString("commands.agent.search", language) : 
            i18n.getString("commands.agent.searchdisable", language)
        }))
        .addFields(
          {
            name: i18n.getString("commands.start.howToUse", language),
            value: i18n.getString("commands.start.instructions", language)
          },
          {
            name: i18n.getString("commands.start.sessionInfo", language),
            value: i18n.getString("commands.start.sessionDetails", language, {
              sessionId: sessionId.split('-')[0],
              model: selectedModel
            })
          }
        )
        .setColor("#00ff00")
        .setFooter({
          text: i18n.getString("commands.start.footer", language),
          iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();

      // 如果加载了历史记录，添加提示
      if (historyId && initialMessages.length > 0) {
        welcomeEmbed.addFields({
          name: i18n.getString("commands.start.historyLoaded", language),
          value: i18n.getString("commands.start.historyLoadedDesc", language, {
            count: Math.floor(initialMessages.length / 2)
          }),
          inline: false
        });
      }

      // 如果有附件，添加提示
      const attachmentInfo = [];
      if (image) attachmentInfo.push(i18n.getString("commands.start.imageAttached", language));
      if (audio) attachmentInfo.push(i18n.getString("commands.start.audioAttached", language));
      if (file) attachmentInfo.push(i18n.getString("commands.start.fileAttached", language));
      
      if (attachmentInfo.length > 0) {
        welcomeEmbed.addFields({
          name: i18n.getString("commands.start.attachments", language),
          value: attachmentInfo.join(", "),
          inline: false
        });
      }

      // 创建控制按钮
      const controlRow1 = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`end_session_${thread.id}`)
            .setLabel(i18n.getString("commands.start.endSession", language))
            .setStyle(ButtonStyle.Danger)
            .setEmoji("🔚"),
          new ButtonBuilder()
            .setCustomId(`session_info_${thread.id}`)
            .setLabel(i18n.getString("commands.start.sessionInfo", language))
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("ℹ️"),
          new ButtonBuilder()
            .setCustomId(`toggle_search_${thread.id}`)
            .setLabel(enableSearch ? 
              i18n.getString("commands.start.disableSearch", language) : 
              i18n.getString("commands.start.enableSearch", language))
            .setStyle(ButtonStyle.Primary)
            .setEmoji("🔍")
        );

      // 第二行按钮 - 高级功能
      const controlRow2 = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`pause_session_${thread.id}`)
            .setLabel(i18n.getString("commands.start.pauseSession", language))
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("⏸️"),
          new ButtonBuilder()
            .setCustomId(`export_session_${thread.id}`)
            .setLabel(i18n.getString("commands.start.exportSession", language))
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("📤"),
          new ButtonBuilder()
            .setCustomId(`clear_history_${thread.id}`)
            .setLabel(i18n.getString("commands.start.clearHistory", language))
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("🗑️")
        );

      // 在线程中发送欢迎消息
      await thread.send({
        content: `${interaction.user}`,
        embeds: [welcomeEmbed],
        components: [controlRow1, controlRow2]
      });

      // 如果有初始提示，立即发送并获取AI回应
      if (initialPrompt) {
        await this.processInitialMessage(thread, sessionData, initialPrompt, image, audio, interaction.user.id, language);
      }

      // 回复原始交互
      const successEmbed = new EmbedBuilder()
        .setTitle(i18n.getString("commands.start.threadCreated", language))
        .setDescription(i18n.getString("commands.start.threadCreatedDesc", language, {
          threadLink: `<#${thread.id}>`
        }))
        .setColor("#00ff00");

      await interaction.editReply({ embeds: [successEmbed] });

      // 记录日志
      logger.info(`AI聊天会话已开启: 用户 ${interaction.user.tag}, 模型 ${selectedModel}, 线程 ${thread.id}`);

      // 自动清理会话 (24小时无活动后)
      // 由 scheduleSessionCleanup 统一管理自动清理

    } catch (error) {
      console.error("Start session error:", error);
      logger.error("Start session error详细信息:", {
        message: error.message,
        stack: error.stack,
        user: interaction.user.tag
      });

      const errorEmbed = new EmbedBuilder()
        .setTitle("AI Chat Session")
        .setDescription(i18n.getString("commands.start.error", language, { 
          error: error.message 
        }))
        .setColor("#ff0000");

      try {
        await interaction.editReply({ embeds: [errorEmbed] });
      } catch (replyError) {
        console.error("Reply error:", replyError);
      }
    }
  },

  // 获取活跃会话
  getActiveSession(threadId) {
    return activeChatSessions.get(threadId);
  },

  // 更新会话活动时间
  updateSessionActivity(threadId) {
    const session = activeChatSessions.get(threadId);
    if (session) {
      session.lastActivity = new Date();
      saveSessionsToFile();
      scheduleSessionCleanup(threadId, session);
    }
  },

  // 结束会话
  async endSession(threadId, client) {
    try {
      // 尝试获取并删除线程
      if (client) {
        const threadChannel = await client.channels.fetch(threadId).catch(err => null);
        if (threadChannel) {
          await threadChannel.delete(`聊天会话手动结束`);
          logger.info(`聊天线程已删除: ${threadId}`);
        }
      }
    } catch (deleteError) {
      logger.error(`删除线程失败: ${threadId}`, deleteError);
    }
    // 从活动会话中移除
    const result = activeChatSessions.delete(threadId);
    saveSessionsToFile();
    if (sessionTimeouts.has(threadId)) {
      clearTimeout(sessionTimeouts.get(threadId));
      sessionTimeouts.delete(threadId);
    }
    return result;
  },

  // 获取所有活跃会话
  getAllActiveSessions() {
    return Array.from(activeChatSessions.values());
  },

  // 处理初始消息
  async processInitialMessage(thread, sessionData, prompt, image, audio, userId, language) {
    try {
      const client = llmService.createLLMClient(config.githubToken);

      // 显示正在生成的消息
      const generatingEmbed = new EmbedBuilder()
        .setDescription(i18n.getString("commands.agent.generating", language))
        .setColor("#3399ff");
      
      const generatingMessage = await thread.send({ embeds: [generatingEmbed] });

      // 构建消息数组，包含会话历史
      let messages = [...sessionData.messages];

      // 格式化用户消息
      const userMessage = await llmService.formatUserMessage(prompt, image, audio, sessionData.model);
      messages = [...messages, ...userMessage];

      // 添加系统提示（如果启用）
      if (sessionData.enableSystemPrompt) {
        messages.unshift(llmService.getSystemPrompt(sessionData.model, language));
      }

      // 获取工具定义
      const tools = llmService.getToolDefinitions(sessionData.enableSearch);

      // 发送LLM请求
      let response = await llmService.sendLLMRequest(messages, sessionData.model, tools, client);
      let actuallySearched = false;
      let searchResults = null;

      // 处理工具调用
      if (response.body.choices && response.body.choices[0].finish_reason === "tool_calls") {
        const toolCall = response.body.choices[0].message.tool_calls[0];
        const functionName = toolCall.function.name;
        let functionArgs;

        try {
          functionArgs = JSON.parse(toolCall.function.arguments);
        } catch (parseError) {
          logger.error("工具调用参数解析失败:", parseError);
          throw new Error("工具调用参数解析失败");
        }

        if (functionName === "search" && sessionData.enableSearch) {
          actuallySearched = true;
          searchResults = await toolFunctions.searchDuckDuckGoLite(functionArgs.query, functionArgs.numResults || 5);
          
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(searchResults)
          });

          response = await llmService.sendLLMRequest(messages, sessionData.model, tools, client);
        }
      }

      // 获取最终输出文本
      const outputText = response.body.choices[0].message.content;

      // 更新会话历史
      sessionData.messages.push(...userMessage);
      sessionData.messages.push({ role: "assistant", content: outputText });

      // 创建响应embed
      const embed = new EmbedBuilder()
        .setDescription(outputText)
        .setColor("#00ff00")
        .setFooter({
          text: `${sessionData.model} | ${i18n.getString("commands.agent.today", language)}`
        });

      // 如果有搜索结果，添加控制按钮
      const components = [];
      if (actuallySearched && searchResults) {
        const searchRow = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`showSearchResults_${generatingMessage.id}`)
              .setLabel(i18n.getString("commands.agent.showSearchResults", language))
              .setStyle(ButtonStyle.Secondary)
              .setEmoji("🔍")
          );
        components.push(searchRow);
      }

      await generatingMessage.edit({ 
        embeds: [embed],
        components
      });

      // 如果有搜索结果，存储它们
      if (searchResults) {
        searchResultsCache.set(generatingMessage.id, searchResults);
        setTimeout(() => {
          searchResultsCache.delete(generatingMessage.id);
        }, 10 * 60 * 1000); // 10分钟后清理缓存
      }

      // 保存对话记录
      try {
        await memoryService.saveChatLogToMongo(
          userId,
          sessionData.model,
          prompt,
          outputText,
          String(generatingMessage.id)
        );
        
        // await memoryService.updateUserMemory(userId, prompt);
      } catch (mongoError) {
        logger.error("保存对话记录失败:", mongoError);
      }

      logger.info(`初始消息处理完成: ${outputText.substring(0, 100)}...`);
      
    } catch (error) {
      logger.error("处理初始消息失败:", error);
      await thread.send({
        embeds: [new EmbedBuilder()
          .setDescription(i18n.getString("commands.agent.error", language, { error: error.message }))
          .setColor("#ff0000")]
      });
    }
  },

  // 导出会话为JSON格式
  exportSessionToJSON(threadId) {
    const session = activeChatSessions.get(threadId);
    if (!session) return null;

    return {
      sessionId: session.sessionId,
      userId: session.userId,
      model: session.model,
      enableSearch: session.enableSearch,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      messageCount: Math.floor(session.messages.length / 2),
      messages: session.messages
    };
  },

  // 获取会话统计信息
  getSessionStats() {
    const sessions = Array.from(activeChatSessions.values());
    const now = new Date();
    
    return {
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => now - s.lastActivity < 5 * 60 * 1000).length, // 5分钟内活跃
      modelUsage: sessions.reduce((acc, session) => {
        acc[session.model] = (acc[session.model] || 0) + 1;
        return acc;
      }, {}),
      searchEnabledSessions: sessions.filter(s => s.enableSearch).length,
      averageMessageCount: sessions.length > 0 ? 
        sessions.reduce((sum, s) => sum + s.messages.length, 0) / sessions.length : 0
    };
  },

  // 清理过期会话
  async cleanupExpiredSessions(client) {
    const now = new Date();
    const expiredThreshold = 24 * 60 * 60 * 1000; // 24小时无活动
    let cleanedCount = 0;
    for (const [threadId, session] of activeChatSessions.entries()) {
      if (now - session.lastActivity > expiredThreshold) {
        try {
          if (client) {
            const threadChannel = await client.channels.fetch(threadId).catch(err => null);
            if (threadChannel) {
              await threadChannel.delete(`聊天会话超时自动结束: ${threadChannel.name}`);
              logger.info(`聊天线程已删除: ${threadId}`);
            }
          }
        } catch (deleteError) {
          logger.error(`删除线程失败: ${threadId}`, deleteError);
        }
        activeChatSessions.delete(threadId);
        saveSessionsToFile();
        if (sessionTimeouts.has(threadId)) {
          clearTimeout(sessionTimeouts.get(threadId));
          sessionTimeouts.delete(threadId);
        }
        cleanedCount++;
      }
    }
    if (cleanedCount > 0) {
      logger.info(`清理了 ${cleanedCount} 个过期会话`);
    }
    return cleanedCount;
  },

  // 暂停会话
  pauseSession(threadId) {
    const session = activeChatSessions.get(threadId);
    if (session) {
      session.isPaused = true;
      session.pausedAt = new Date();
      saveSessionsToFile();
      return true;
    }
    return false;
  },

  // 恢复会话
  resumeSession(threadId) {
    const session = activeChatSessions.get(threadId);
    if (session) {
      session.isPaused = false;
      session.pausedAt = null;
      session.lastActivity = new Date();
      saveSessionsToFile();
      scheduleSessionCleanup(threadId, session);
      return true;
    }
    return false;
  },

  // 检查会话是否暂停
  isSessionPaused(threadId) {
    const session = activeChatSessions.get(threadId);
    return session ? !!session.isPaused : false;
  },

  // 清理会话历史记录
  clearSessionHistory(threadId) {
    const session = activeChatSessions.get(threadId);
    if (session) {
      session.messages = [];
      session.lastActivity = new Date();
      saveSessionsToFile();
      scheduleSessionCleanup(threadId, session);
      return true;
    }
    return false;
  },

  // 获取会话导出数据
  getSessionExportData(threadId) {
    const session = activeChatSessions.get(threadId);
    if (!session) return null;

    return {
      sessionId: session.sessionId,
      model: session.model,
      enableSearch: session.enableSearch,
      createdAt: session.createdAt,
      messageCount: Math.floor(session.messages.length / 2),
      totalMessages: session.messages.length,
      lastActivity: session.lastActivity,
      conversationHistory: session.messages.map((msg, index) => ({
        sequence: index + 1,
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        timestamp: new Date().toISOString()
      }))
    };
  }
};
