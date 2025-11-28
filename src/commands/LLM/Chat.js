const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./chatlog.db");
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const logger = require("../../utils/logger.js");
const crypto = require("crypto");
const mongoose = require("mongoose");
const config = require("../../config.js");
const i18n = require("../../utils/i18n");

// 导入拆分的模块
const memoryService = require("./utils/memoryService");
const toolFunctions = require("./utils/toolFunctions");
const llmService = require("./utils/llmService");
const { getModelEmoji } = require("../../utils/modelEmojis");
const titleGenerator = require("./utils/titleGenerator");
const { searchResultsCache } = require("../../buttons/showSearchResults");


// 初始化数据库表
db.run(`
  CREATE TABLE IF NOT EXISTS chat_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    model TEXT,
    prompt TEXT,
    reply TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// 从LLM服务获取所有可用模型
const getAvailableModels = () => {
  return llmService.getAllAvailableModels();
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("agent")
    .setNameLocalizations({
      "zh-CN": "agent",
      "zh-TW": "agent"
    })
    .setDescription("Use AI agent features")
    .setDescriptionLocalizations({
      "zh-CN": "使用AI代理功能",
      "zh-TW": "使用AI代理功能"
    })
    .addStringOption((option) =>
      option.setName("text")
    .setDescription("Enter your prompt")
    .setDescriptionLocalizations({
      "zh-CN": "输入您的提示",
      "zh-TW": "輸入您的提示"
    })
    .setRequired(true)
    )
    .addStringOption((option) => {
      const choices = getAvailableModels();
      option
        .setName("model")
        .setDescription("Select a model (default: gpt-5-nano <25 times, then switch to ministral-small-2503 >)")
        .setDescriptionLocalizations({
          "zh-CN": "选择模型 (不选择：gpt-5-nano <25次后改为 ministral-small-2503 >)",
          "zh-TW": "選擇模型 (不選擇：gpt-5-nano <25次後改為 ministral-small-2503 >)"
        })
        .setRequired(false)
        .setAutocomplete(true);
      // 只添加前25个模型选项

      return option;
    })
    .addStringOption((option) =>
      option
        .setName("history")
        .setDescription("Select a history to use as a prompt")
        .setDescriptionLocalizations({
          "zh-CN": "选择一个历史记录作为提示",
          "zh-TW": "選擇一個歷史記錄作為提示"
        })
        .setAutocomplete(true)
    )
    .addBooleanOption((option) =>
      option
        .setName("enable_search")
        .setDescription("Enable web search (default: no) (this will consume extra usage)")
        .setDescriptionLocalizations({
          "zh-CN": "是否启用联网搜索 (默认：否) (这将会消耗额外的使用次数)",
          "zh-TW": "是否啟用聯網搜尋 (預設：否) (這將會消耗額外的使用次數)"
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
    .addAttachmentOption((option) =>
      option.setName("image").setDescription("Upload an image")
    .setDescriptionLocalizations({
      "zh-CN": "上传图片",
      "zh-TW": "上傳圖片"
    })
    )
    .addAttachmentOption((option) =>
      option.setName("audio").setDescription("Upload audio")
    .setDescriptionLocalizations({
      "zh-CN": "上传音频",
      "zh-TW": "上傳音訊"
    })
    )
    .addAttachmentOption((option) =>
      option.setName("file").setDescription("Upload a file")
    .setDescriptionLocalizations({
      "zh-CN": "上传文件",
      "zh-TW": "上傳檔案"
    })
    ),

  async autocompleteRun(interaction) {
    const guildId = interaction.guild.id;
    const language = i18n.getServerLanguage(guildId);
    try {
      const focusedValue = interaction.options.getFocused();
      const focusedOption = interaction.options.getFocused(true);

      // 判断是否为model选项的自动补全
      if (focusedOption && focusedOption.name === "model") {
        const allModels = getAvailableModels();
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
          value: String(row.interaction_id || 'no_id')
        };
      }).filter(choice => choice.value && choice.value !== 'no_id');
      await interaction.respond(choices.slice(0, 25));
    } catch (error) {
      console.error("Autocomplete 錯誤:", error);
      await interaction.respond([]);
    }
  },

  async execute(interaction, messageId) {
    const startTime = Date.now();
    let selectedModel = interaction.options.getString("model");
    const historyId = interaction.options.getString("history");
    const prompt = interaction.options.getString("text") || "";
    const image = interaction.options.getAttachment("image");
    const audio = interaction.options.getAttachment("audio");
    const file = interaction.options.getAttachment("file");
    const guildId = interaction.guild?.id || interaction.guildId;
    const language = i18n.getServerLanguage(guildId); 
    // 获取用户ID，兼容多种情况
    const userId = interaction.user?.id || interaction.member?.user?.id || interaction.author?.id;
    // 获取是否启用联网搜索的选项，默认为false
    const enableSearch = interaction.options.getBoolean("enable_search") || false;
    // 获取是否启用系统提示的选项，默认为true
    const enableSystemPrompt = interaction.options.getBoolean("enable_systemprompt") !== false;

    // 发送初始响应
    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setTitle(i18n.getString("commands.agent.generating", language))
        .setColor("#3399ff")]
    });

    // 获取模型使用限制
    const usageLimits = llmService.getModelUsageLimits();

    try {
      // 准备历史消息
      let historyMessages = [];
      if (historyId) {
        const history = await memoryService.getConversationHistory(historyId, userId);
        if (history && history.length > 0) {
          historyMessages = history;
        } else {
          logger.info(`找不到历史对话: ${historyId}`);
        }
      }

      // 调用统一的处理函数
      const result = await llmService.processUserRequest({
        userId,
        prompt,
        image,
        audio,
        modelName: selectedModel,
        historyMessages,
        enableSearch,
        enableSystemPrompt,
        language
      });

      // 检查使用限制
      if (!result.success && result.isUsageExceeded) {
        const embed = new EmbedBuilder()
          .setTitle("AI Text Generation")
          .setDescription(i18n.getString("commands.agent.usageExceeded", language, {
            limit: result.usageInfo.limit,
            usage: result.usageInfo.usage,
            model: result.modelName
          }))
          .setColor("#ff0000");
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // 获取结果数据
      const { 
        outputText, 
        searchResults, 
        dataURI, 
        videoUrl,
        remoteVideoUrl,
        actuallySearched, 
        usageInfo,
        tokenUsage,
        toolUsed
      } = result;
      
      // 更新 selectedModel (可能在 updateUserUsage 中被修改)
      selectedModel = usageInfo.selectedModel;

      // 记录生成信息
      if (dataURI) {
        logger.info(`AI文本生成: ${outputText}\t AI生成圖片\t 使用者: ${interaction.user.tag}`);
      } else {
        logger.info(`AI文本生成: ${outputText} \t 使用者: ${interaction.user.tag} \t 語言: ${language}`);
      }

      // 保存到SQLite数据库
      db.run(
        "INSERT INTO chat_log (user_id, model, prompt, reply, timestamp) VALUES (?, ?, ?, ?, ?)",
        [userId, selectedModel, prompt, outputText, new Date().toISOString()]
      );

      // 创建响应组件
      let embed;
      const row = new ActionRowBuilder();

      // Add Open in Web button
      if (config.webUrl) {
        row.addComponents(
          new ButtonBuilder()
            .setLabel(i18n.getString("commands.agent.openInWeb", language))
            .setStyle(ButtonStyle.Link)
            .setURL(`${config.webUrl}/chat/${interaction.id}`)
        );
      }

      const today = i18n.getString("commands.agent.today", language);

      let footerText = `Powered by ${selectedModel}`;
      if (toolUsed === "flux") footerText += " with Flux-1";
      else if (toolUsed === "zhipu-cogview") footerText += " with CogView-3";
      else if (toolUsed === "zhipu-cogvideo") footerText += " with CogVideoX";
      
      footerText += ` | ${today}：${usageInfo.usage}/${usageInfo.limit}`;

      // 获取模型类型和 emoji
      const providerType = llmService.getProviderType(selectedModel);
      const modelEmoji = getModelEmoji(selectedModel, providerType);

      // 生成標題
      let generatedTitle = await titleGenerator.generateTitle(prompt, outputText, language);

      // 处理思考模型（只要回答里有<think>标签就处理）
      if (/<think>[\s\S]*?<\/think>/.test(outputText)) {
        const thinkContent = outputText.match(/<think>([\s\S]*?)<\/think>/);
        const displayText = outputText
          .replace(/<think>[\s\S]*?<\/think>/g, "")
          .trim();

        embed = new EmbedBuilder()
          .setTitle(`${modelEmoji} ${generatedTitle}`)
          .setDescription(displayText)
          .setColor("#00ff00")
          .setFooter({
            text: footerText
          });

        // 处理生成的图像
        if (dataURI && dataURI.startsWith("data:image/jpeg;base64,")) {
          const imageResult = toolFunctions.processGeneratedImage(dataURI);
          if (imageResult.path) {
            // embed 使用附件內嵌圖片
            const filename = path.basename(imageResult.path);
            embed.setDescription(outputText ? outputText : i18n.getString("commands.agent.imageGenerated", language));
            embed.setImage(`attachment://${filename}`);
            embed.setFooter({text: `Powered by ${selectedModel} with Flux-1 | ${today}：${usageInfo.usage}/${usageInfo.limit}`});
            try {
              await interaction.editReply({ embeds: [embed], files: [imageResult.attachment] });
            } catch (e) {
              // fallback to followUp if edit fails
              await interaction.followUp({ embeds: [embed], files: [imageResult.attachment] });
            }
            // 删除临时文件
            try { fs.unlinkSync(imageResult.path); } catch (e) { logger.warn(`无法删除临时图片 ${imageResult.path}: ${e.message}`); }
          }
        } else if (videoUrl) {
          // 處理生成的視頻 - 發送文件
          embed.setDescription(displayText || i18n.getString("commands.agent.zhipuVideoGenerated", language));
          const videoAttachment = new AttachmentBuilder(videoUrl);
          embed.setFooter({text: footerText});
          
          try {
            await interaction.editReply({ embeds: [embed], files: [videoAttachment] });
          } catch (e) {
            await interaction.followUp({ embeds: [embed], files: [videoAttachment] });
          }
          
          // 删除临时视频文件
          try { fs.unlinkSync(videoUrl); } catch (e) { logger.warn(`无法删除临时视频 ${videoUrl}: ${e.message}`); }
        } else if (dataURI) {
          logger.error("Invalid dataURI format");
        }
        const openthink = i18n.getString("commands.agent.openThink", language);
        const hidethink = i18n.getString("commands.agent.hideThink", language);
        const think = i18n.getString("commands.agent.think", language);
        // 添加思考过程按钮
        if (thinkContent && thinkContent[1].trim()) {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId("showThink")
              .setLabel(openthink)
              .setStyle(ButtonStyle.Secondary)
          );

          // 设置按钮交互
          const filter = i =>
            ["showThink", "hideThink"].includes(i.customId) &&
            i.user.id === interaction.user.id;
          
          if (interaction.channel) {
            // 在公开频道中
            const collector = interaction.channel.createMessageComponentCollector({
              filter,
              time: 60000
            });
            
            collector.on('collect', async i => {
              if (i.customId === "showThink") {
                embed.spliceFields(0, 0, {
                  name: think,
                  value: thinkContent[1],
                  inline: false
                });
                row.components[0]
                  .setLabel(hidethink)
                  .setCustomId("hideThink");
                await i.update({ embeds: [embed], components: [row] });
              } else if (i.customId === "hideThink") {
                embed.spliceFields(0, 1);
                row.components[0]
                  .setLabel(openthink)
                  .setCustomId("showThink");
                await i.update({ embeds: [embed], components: [row] });
              }
            });
          } else {
            // 在私聊环境中
            const collector = interaction.user.createDM().then(dm => {
              return dm.createMessageComponentCollector({
                filter,
                time: 60000
              });
            });
          
            collector.then(dmCollector => {
              dmCollector.on('collect', async i => {
                if (i.customId === "showThink") {
                  embed.spliceFields(0, 0, {
                    name: think,
                    value: thinkContent[1],
                    inline: false
                  });
                  row.components[0]
                    .setLabel(hidethink)
                    .setCustomId("hideThink");
                  await i.update({ embeds: [embed], components: [row] });
                } else if (i.customId === "hideThink") {
                  embed.spliceFields(0, 1);
                  row.components[0]
                    .setLabel(openthink)
                    .setCustomId("showThink");
                  await i.update({ embeds: [embed], components: [row] });
                }
              });
            });
          }
        }
      } else {
        // 处理其他模型的标准响应
        embed = new EmbedBuilder()
          .setTitle(`${modelEmoji} ${generatedTitle}`)
          .setDescription(outputText || i18n.getString("commands.agent.noContent", language) || "無內容")
          .setColor("#00ff00")
          .setFooter({
            text: footerText
          });

        // 处理生成的图像
        if (dataURI && dataURI.startsWith("data:image/jpeg;base64,")) {
          const imageResult = toolFunctions.processGeneratedImage(dataURI);
          if (imageResult.path) {
            const filename = "generated_image.jpg";
            imageResult.attachment.setName(filename);
            
            embed.setDescription(outputText ? outputText : i18n.getString("commands.agent.imageGenerated", language));
            embed.setImage(`attachment://${filename}`);
            
            let footerText = `${selectedModel} | ${today}：${usageInfo.usage}/${usageInfo.limit}`;
            if (toolUsed === 'flux') {
                footerText = `${selectedModel} with Flux-1 | ${today}：${usageInfo.usage}/${usageInfo.limit}`;
            } else if (toolUsed === 'zhipu-cogview') {
                footerText = `${selectedModel} with CogView-3 | ${today}：${usageInfo.usage}/${usageInfo.limit}`;
            }
            embed.setFooter({text: footerText});

            try {
              await interaction.editReply({ embeds: [embed], files: [imageResult.attachment] });
            } catch (e) {
              await interaction.followUp({ embeds: [embed], files: [imageResult.attachment] });
            }
            try { fs.unlinkSync(imageResult.path); } catch (e) { logger.warn(`无法删除临时图片 ${imageResult.path}: ${e.message}`); }
          }
        } else if (videoUrl) {
          // 處理生成的視頻 - 發送文件
          embed.setDescription(outputText || i18n.getString("commands.agent.zhipuVideoGenerated", language));
          const videoAttachment = new AttachmentBuilder(videoUrl);
          embed.setFooter({text: footerText});
          
          try {
            await interaction.editReply({ embeds: [embed], files: [videoAttachment] });
          } catch (e) {
            await interaction.followUp({ embeds: [embed], files: [videoAttachment] });
          }
          
          // 删除临时视频文件
          try { fs.unlinkSync(videoUrl); } catch (e) { logger.warn(`无法删除临时视频 ${videoUrl}: ${e.message}`); }
        } else if (dataURI) {
          logger.error("Invalid dataURI format");
        }
      }

      // 添加搜索结果按钮
      if (searchResults && searchResults.length > 0) {
        // 生成唯一的 messageId 並緩存搜尋結果
        const messageId = crypto.randomBytes(8).toString('hex');
        searchResultsCache.set(messageId, searchResults);
        
        // 設置緩存過期時間 (5 分鐘)
        setTimeout(() => {
          searchResultsCache.delete(messageId);
        }, 5 * 60 * 1000);
        
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`showSearchResults_${messageId}`)
            .setLabel(i18n.getString("commands.agent.showSearchResults", language))
            .setStyle(ButtonStyle.Secondary)
        );
      }
      const searchenable = i18n.getString("commands.agent.search", language);
      const searchdisable = i18n.getString("commands.agent.searchdisable", language);
      const searchnotused = i18n.getString("commands.agent.searchnotused", language);

      // 添加联网搜索信息到页脚
      let searchStatus = "";
      if (enableSearch) {
        if (actuallySearched) {
          searchStatus = ` | 🔍 ${searchenable}`;
        } else {
          searchStatus = ` | 🔍 ${searchnotused}`;
        }
      } else {
        searchStatus = ` | 🔍 ${searchdisable}`;
      }
      
      // 移除 footerText 中可能已經包含的用量信息，避免重複
      // 其實 footerText 已經包含了用量信息，所以我們只需要追加搜索狀態
      // 但是上面的 footerText 構建邏輯是: Powered by ... | Date: Usage
      // 所以直接追加是可以的
      
      embed.setFooter({
        text: footerText + searchStatus
      });

      // 添加历史查看按钮
      row.addComponents(
        new ButtonBuilder()
          .setCustomId("viewHistory")
          .setLabel(i18n.getString("commands.agent.viewHistory", language))
          .setStyle(ButtonStyle.Primary)
      );

      // 发送最终响应
      try {
        await interaction.editReply({ embeds: [embed], components: [row] });
      } catch (err) {
        console.error("Edit reply failed, creating a new message:", err);
        await interaction.followUp({ embeds: [embed], components: [row] });
      }

      // 同步保存到MongoDB
      let sentMessageId = messageId;
      try {
        const reply = typeof interaction.fetchReply === 'function' ? 
          await interaction.fetchReply() : null;
        
        if (reply) {
          sentMessageId = reply.id;
        }
      } catch (fetchErr) {
        console.error("Fetch reply error:", fetchErr);
      }

      // 保存对话记录并更新用户记忆
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      const extraData = {
        userInfo: {
          username: interaction.user.username,
          avatar_url: interaction.user.displayAvatarURL({ extension: 'png', size: 256 }),
          display_name: interaction.user.displayName
        },
        guildInfo: interaction.guild ? {
          name: interaction.guild.name,
          id: interaction.guild.id,
          icon_url: interaction.guild.iconURL({ extension: 'png', size: 256 })
        } : null,
        usage: {
          prompt_tokens: tokenUsage?.prompt_tokens || 0,
          completion_tokens: tokenUsage?.completion_tokens || 0,
          total_tokens: tokenUsage?.total_tokens || 0
        },
        options: {
          enable_search: enableSearch,
          enable_system_prompt: enableSystemPrompt
        },
        processingTime: processingTime,
        searchResults: searchResults,
        generatedImage: dataURI,
        generatedVideo: remoteVideoUrl, // 使用遠程 URL 而不是本地路徑，以便網站可以訪問
        toolUsed: toolUsed,
        title: generatedTitle
      };

      await memoryService.saveChatLogToMongo(
        userId, 
        selectedModel, 
        prompt, 
        outputText, 
        interaction.id,
        historyId || null,
        extraData
      );
      
      logger.info(`保存对话记录到MongoDB，消息ID: ${sentMessageId}`);
      
      // 更新用户的长期记忆
      // await memoryService.updateUserMemory(interaction.user.id, prompt);

    } catch (err) {
      console.error("LLM API Error:", err);
      logger.error("LLM API Error详细信息:", {
        message: err.message,
        stack: err.stack,
        selectedModel: selectedModel
      });
      
      const failEmbed = new EmbedBuilder()
        .setTitle("AI Text Generation")
        .setDescription(i18n.getString("commands.agent.error", language, { error: err.message }))
        .setColor("#ff0000");
        
      try {
        await interaction.editReply({ embeds: [failEmbed] });
      } catch (editErr) {
        console.error("Edit reply failed, creating a new message:", editErr);
        await interaction.followUp({ embeds: [failEmbed] });
      }
    }
  }
};