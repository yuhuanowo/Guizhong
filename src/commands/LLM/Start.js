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
const SESSIONS_DIR = path.resolve(__dirname, '../../JSON');
const SESSIONS_FILE = path.join(SESSIONS_DIR, 'sessions.json');
let activeChatSessions = new Map();

// 从 JSON 文件加载会话
function loadSessionsFromFile() {
  // 确保 sessions 目录存在
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
  if (fs.existsSync(SESSIONS_FILE)) {
    try {
      // 读取并去除 BOM
      const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8');
      const cleaned = raw.replace(/^\uFEFF/, '').trim();

      if (!cleaned) {
        logger.warn(`sessions.json 为空，跳过恢复 (${SESSIONS_FILE})`);
        activeChatSessions = new Map();
        return;
      }

      let sessionsArr = JSON.parse(cleaned);
      if (!Array.isArray(sessionsArr)) {
        logger.warn(`sessions.json 格式不是数组，已忽略 (${SESSIONS_FILE})`);
        sessionsArr = [];
      }

      activeChatSessions = new Map();

      for (const rawSession of sessionsArr) {
        try {
          const session = { ...rawSession };
          // 恢复 Date 类型并做容错
          session.createdAt = new Date(session.createdAt || Date.now());
          session.lastActivity = new Date(session.lastActivity || Date.now());
          if (isNaN(session.createdAt.getTime())) session.createdAt = new Date();
          if (isNaN(session.lastActivity.getTime())) session.lastActivity = new Date();

          if (!session.threadId) {
            logger.warn('跳过无效会话（缺少 threadId）');
            continue;
          }

          activeChatSessions.set(session.threadId, session);
          // 重新计时自动清理（永久会话会被跳过计时）
          scheduleSessionCleanup(session.threadId, session);
        } catch (oneErr) {
          logger.error('恢复单条会话失败，已跳过:', oneErr);
        }
      }
      logger.info(`已从 sessions.json 恢复 ${activeChatSessions.size} 个会话`);
    } catch (e) {
      // 备份损坏的文件，避免反复报错
      try {
        const backupPath = path.join(SESSIONS_DIR, `sessions.json.bak-${Date.now()}`);
        fs.copyFileSync(SESSIONS_FILE, backupPath);
        logger.error(`加载 sessions.json 失败 (${SESSIONS_FILE})，已备份为: ${backupPath}`, e);
      } catch (backupErr) {
        logger.error(`加载 sessions.json 失败且备份失败 (${SESSIONS_FILE})`, backupErr);
      }
      // 重置内存并写入空数组，防止下次启动继续失败
      activeChatSessions = new Map();
      try { saveSessionsToFile(); } catch {}
    }
  }
}

// 保存会话到 JSON 文件
function saveSessionsToFile() {
  try {
    // 确保 sessions 目录存在
    if (!fs.existsSync(SESSIONS_DIR)) {
      try {
        fs.mkdirSync(SESSIONS_DIR, { recursive: true });
        logger.info(`创建目录: ${SESSIONS_DIR}`);
      } catch (dirError) {
        logger.error(`创建目录失败 (${SESSIONS_DIR}):`, dirError);
        return false;
      }
    }
    
    // 准备要保存的数据
    const sessionsArr = Array.from(activeChatSessions.values())
      .map(session => {
        // 创建一个没有循环引用的纯数据对象
        const cleanSession = { ...session };
        // 移除不应该序列化的属性
        delete cleanSession.client;
        return cleanSession;
      });
    
    // 写入文件，使用临时文件+重命名的方式避免部分写入
    const tempFile = `${SESSIONS_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(sessionsArr, null, 2), 'utf-8');
    fs.renameSync(tempFile, SESSIONS_FILE);
    
    logger.info(`成功保存会话到: ${SESSIONS_FILE} (共 ${sessionsArr.length} 个会话)`);
    return true;
  } catch (e) {
    logger.error(`保存 sessions.json 失败 (${SESSIONS_FILE}):`, e);
    return false;
  }
}

// 启动时加载会话
loadSessionsFromFile();

// 自动清理计时器 map
const sessionTimeouts = new Map();

function scheduleSessionCleanup(threadId, sessionData) {
  // 如果是永久会话，不设置清理计时器
  if (sessionData.isPermanent) {
    logger.info(`会话 ${threadId} 设为永久会话，不会被自动清理`);
    // 如果之前有计时器，清除它
    if (sessionTimeouts.has(threadId)) {
      clearTimeout(sessionTimeouts.get(threadId));
      sessionTimeouts.delete(threadId);
    }
    return;
  }

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
    .addStringOption((option) => {
      const modelOption = option
        .setName("model")
        .setDescription("Select AI model (default: gpt-4.1-nano)")
        .setDescriptionLocalizations({
          "zh-CN": "选择AI模型 (默认: gpt-4.1-nano)",
          "zh-TW": "選擇AI模型 (預設: gpt-4.1-nano)"
        })
        .setRequired(false)
        .setAutocomplete(true);
      
      return modelOption;
    })
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
    )
    .addBooleanOption((option) =>
      option
        .setName("permanent_session")
        .setDescription("Create a permanent session that won't be deleted (Admin only)")
        .setDescriptionLocalizations({
          "zh-CN": "创建永久会话，不会被自动删除（仅管理员）",
          "zh-TW": "創建永久會話，不會被自動刪除（僅管理員）"
        })
        .setRequired(false)
    ),

  async autocompleteRun(interaction) {
    const guildId = interaction.guild.id;
    const language = i18n.getServerLanguage(guildId);
    try {
      const focusedValue = interaction.options.getFocused();
      const focusedOption = interaction.options.getFocused(true);
      
      // 判断是否为model选项的自动补全
      if (focusedOption && focusedOption.name === "model") {
        const allModels = llmService.getAllAvailableModels();
        // 支持中英文模糊搜索 name 和 value
        const filtered = allModels.filter(m =>
          m.name.toLowerCase().includes(focusedValue.toLowerCase()) ||
          m.value.toLowerCase().includes(focusedValue.toLowerCase())
        );
        // Discord最多返回25个
        await interaction.respond(filtered.slice(0, 25));
        return;
      }

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
    const requestPermanent = interaction.options.getBoolean("permanent_session") || false;
    const guildId = interaction.guild.id;
    const language = i18n.getServerLanguage(guildId);
    
    // 检查是否有管理员权限创建永久会话
    const isAdmin = interaction.member.permissions.has("ADMINISTRATOR") || 
                    interaction.member.permissions.has("MANAGE_GUILD");
    const isPermanent = requestPermanent && isAdmin;

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
        isPermanent, // 是否为永久会话（不会被自动删除）
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

      // 获取模型的友好显示信息
      const modelInfo = this.getModelDisplayInfo(selectedModel);
      
      // 创建欢迎消息
      const welcomeEmbed = new EmbedBuilder()
        .setTitle(i18n.getString("commands.start.sessionStarted", language))
        .setDescription(i18n.getString("commands.start.welcomeMessage", language, {
          model: modelInfo.displayName,
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
              model: modelInfo.displayName
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
      
      // 如果是永久会话，添加提示
      if (isPermanent) {
        welcomeEmbed.addFields({
          name: "📌 永久会话",
          value: "此会话已设为永久会话，不会被自动删除",
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

  // 结束会话 (仅负责清除内存中的会话数据)
  async endSession(threadId, client, forceDelete = false, userId = null, isAdmin = false) {
    // 检查是否为永久会话
    const session = activeChatSessions.get(threadId);
    if (!session) {
      logger.info(`尝试结束不存在的会话: ${threadId}`);
      return {
        success: false,
        isPermanent: false,
        message: "会话不存在或已被删除"
      };
    }
    
    if (session.isPermanent && !forceDelete && !isAdmin) {
      // 只有管理员或强制删除才能删除永久会话
      logger.info(`尝试结束永久会话 ${threadId}，操作被拒绝`);
      return {
        success: false,
        isPermanent: true,
        message: "此会话是永久会话，不能被删除"
      };
    }
    
    // 如果指定了用户ID，检查是否为管理员或会话创建者
    if (userId && session.userId !== userId && !isAdmin) {
      // 不是会话创建者也不是管理员
      logger.info(`用户 ${userId} 尝试结束不属于他的会话 ${threadId}`);
      return {
        success: false,
        isPermanent: session.isPermanent,
        message: "你没有权限结束此会话"
      };
    }
    
    // 从活动会话中移除
    logger.info(`清除会话数据: ${threadId}`);
    activeChatSessions.delete(threadId);
    
    // 保存会话状态
    saveSessionsToFile();
    
    // 清除定时器
    if (sessionTimeouts.has(threadId)) {
      clearTimeout(sessionTimeouts.get(threadId));
      sessionTimeouts.delete(threadId);
    }
    
    return {
      success: true,
      message: "会话数据已清除，频道需要手动删除"
    };
  },

  // 获取所有活跃会话
  getAllActiveSessions() {
    return Array.from(activeChatSessions.values());
  },

  // 处理初始消息
  async processInitialMessage(thread, sessionData, prompt, image, audio, userId, language) {
    try {
      // 创建LLM客户端（根据模型类型自动选择适当的提供商）
      const client = llmService.createLLMClient(sessionData.model);
      
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

      // 获取模型的友好显示信息
      const modelInfo = this.getModelDisplayInfo(sessionData.model);
      
      // 创建响应embed
      const embed = new EmbedBuilder()
        .setDescription(outputText)
        .setColor("#00ff00")
        .setFooter({
          text: `${modelInfo.displayName} | ${i18n.getString("commands.agent.today", language)}`
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
    
    const modelInfo = this.getModelDisplayInfo(session.model);

    return {
      sessionId: session.sessionId,
      userId: session.userId,
      model: session.model,
      modelDisplayName: modelInfo.displayName,
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
      // 跳过永久会话
      if (session.isPermanent) {
        continue;
      }
      
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
      isPermanent: session.isPermanent,
      conversationHistory: session.messages.map((msg, index) => ({
        sequence: index + 1,
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        timestamp: new Date().toISOString()
      }))
    };
  },
  
  // 强制删除永久会话（仅限管理员使用）
  /**
   * 强制删除永久会话（仅限管理员使用）
   * @param {string} threadId
   * @param {object} client
   * @param {string} userId
   * @param {boolean} isAdmin - 必须传递，调用方需判断权限
   */
  async forceDeleteSession(threadId, client, userId, isAdmin) {
    const session = activeChatSessions.get(threadId);
    // 检查会话是否存在
    if (!session) {
      return {
        success: false,
        message: "会话不存在"
      };
    }
    // 明确检查isAdmin参数，确保只有管理员才能强制删除永久会话
    if (!isAdmin) {
      logger.info(`尝试强制删除会话 ${threadId}，但用户不是管理员，操作被拒绝`);
      return {
        success: false,
        message: "只有管理员才能强制删除永久会话"
      };
    }
    // 执行删除，必须传递 isAdmin
    return await this.endSession(threadId, client, true, userId, isAdmin);
  },
  
  /**
   * 获取模型的友好显示名称
   * 直接调用llmService中的方法
   * @param {string} modelName 模型名称
   * @returns {Object} 包含模型友好显示名称的对象
   */
  getModelDisplayInfo(modelName) {
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
};
