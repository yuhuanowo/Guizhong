const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./chatlog.db");
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const fs = require("fs");
const logger = require("../../utils/logger.js");
const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");
const config = require("../../config.js");
const i18n = require("../../utils/i18n");

// 导入拆分的模块
const memoryService = require("./utils/memoryService");
const toolFunctions = require("./utils/toolFunctions");
const llmService = require("./utils/llmService");


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
        .setDescription("Select a model (default: gpt-4.1-nano <25 times, then switch to ministral-small-2503 >)")
        .setDescriptionLocalizations({
          "zh-CN": "选择模型 (不选择：gpt-4.1-nano <25次后改为 ministral-small-2503 >)",
          "zh-TW": "選擇模型 (不選擇：gpt-4.1-nano <25次後改為 ministral-small-2503 >)"
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

    // 更新用户使用量并获取相关信息
    const usageInfo = llmService.updateUserUsage(userId, selectedModel, usageLimits);
    selectedModel = usageInfo.selectedModel;

    // 检查是否超出使用限制
    if (usageInfo.isExceeded) {
      const embed = new EmbedBuilder()
        .setTitle("AI Text Generation")
        .setDescription(i18n.getString("commands.agent.usageExceeded", language, {
          limit: usageInfo.limit,
          usage: usageInfo.usage,
          model: selectedModel
        }))
        .setColor("#ff0000");
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // 创建LLM客户端（根据模型类型自动选择适当的提供商）
    const client = llmService.createLLMClient(selectedModel);

    try {
      // 构建消息数组
      let messages = [];
      
      // 如果有历史ID，加载历史对话
      if (historyId) {
        const historyChat = await memoryService.getHistoryById(historyId, userId);
        if (historyChat) {
          messages.push({ role: "user", content: historyChat.prompt });
          messages.push({ role: "assistant", content: historyChat.reply });
        } else {
          logger.info(`找不到历史对话: ${historyId}`);
        }
      }

      // 格式化用户消息
      const userMessage = await llmService.formatUserMessage(prompt, image, audio, selectedModel);
      messages = [...messages, ...userMessage];


      // 添加系统提示（如果启用）
      if (enableSystemPrompt) {
        messages.unshift(llmService.getSystemPrompt(selectedModel, language));
      }

      // 获取工具定义
      const tools = llmService.getToolDefinitions(enableSearch);

      // 发送LLM请求
      let response = await llmService.sendLLMRequest(messages, selectedModel, tools, client);
      let actuallySearched = false;
      let searchResults = null;

      // 检查响应状态
      if (response.status !== "200") {
        throw response.body.error;
      }

      // 处理可能的工具调用
      let dataURI = null;
      if (
        response.body.choices &&
        response.body.choices[0].finish_reason === "tool_calls"
      ) {
        messages.push(response.body.choices[0].message);
        const calls = response.body.choices[0].message.tool_calls;
        if (calls && calls.length === 1 && calls[0].type === "function") {
          const parsed = JSON.parse(calls[0].function.arguments);
          if (calls[0].function.name === "generateImage") {
            dataURI = await toolFunctions.generateImageCloudflare(parsed.prompt);
            messages.push({
              tool_call_id: calls[0].id,
              role: "tool",
              name: calls[0].function.name,
              content: JSON.stringify({ generateResult: "已生成提示詞為 " + parsed.prompt + " 的圖片" })
            });
          } else if (calls[0].function.name === "searchDuckDuckGo") {
            actuallySearched = true;
            searchResults = await toolFunctions.searchDuckDuckGoLite(parsed.query, parsed.numResults);
            if (searchResults.length === 0) {
              messages.push({
                tool_call_id: calls[0].id,
                role: "tool",
                name: calls[0].function.name,
                content: JSON.stringify({ searchResults: "No results found" })
              });
            } else {
              messages.push({
                tool_call_id: calls[0].id,
                role: "tool",
                name: calls[0].function.name,
                content: JSON.stringify({ searchResults: searchResults })
              });
            }

            // 使用搜索结果再次发送请求
            llmService.updateUserUsage(userId, selectedModel, usageLimits);

            response = await llmService.sendLLMRequest(messages, selectedModel, tools, client);
            if (
              response.body.choices &&
              response.body.choices[0].finish_reason === "tool_calls"
            ) {
              messages.push(response.body.choices[0].message);
              const calls = response.body.choices[0].message.tool_calls;
              if (calls && calls.length === 1 && calls[0].type === "function") {
                const parsed = JSON.parse(calls[0].function.arguments);
                if (calls[0].function.name === "generateImage") {
                  dataURI = await toolFunctions.generateImageCloudflare(parsed.prompt);
                  messages.push({
                    tool_call_id: calls[0].id,
                    role: "tool",
                    name: calls[0].function.name,
                    content: JSON.stringify({generateResult: "已生成提示詞為 " + parsed.prompt + " 的圖片"})
                  });
                } 
              }
            }

            if (response.status !== "200") {
              throw response.body.error;
            }
          }
        }
      }

      // 获取最终输出文本
      const outputText = response.body.choices[0].message.content;

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
      const today = i18n.getString("commands.agent.today", language);

      // 模型类型到emoji映射
      const modelEmojiMap = {
        'gpt-4': '<:gpt_4:1402509357631017083>',
        'gpt-4o': '<:gpt_4:1402509357631017083>',
        'gpt-4.1': '<:gpt_4:1402509357631017083>',
        'gpt-oss': '<:gpt_o1:1402509357631017083>',
        'o1': '<:gpt_o1:1402509263582003320>',
        'llama': '<:llama:1402509206954967081>',
        'microsoft': '<:microsoft:1402509171026427975>',
        'qwen': '<:qwen:1402509097667924101>',
        'deepseek': '<:deepseek:1402509005271601213>',
        'gemini': '<:gemini:1402508963861233705>',
        'google': '<:google:1402508947562434630>',
        'grok': '<:grok:1402508918189588480>',
        'groq': '<:groq:1402508869330141246>',
        'minimax': '<:minimax:1402508854578778162>',
        'mistral': '<:mistral:1402508840515145778>',
        'openai': '<:openai:1402508782218772511>',
        'cohere': '<:cohere:1402508694779859007>',
        'github': '<:github:1402508652287361094>',
        'openrouter': '<:openrouter:1402508596784271442>',
        'ollama': '<:ollama:1402508573518594148>',
      };

      // 获取模型类型
      const providerType = llmService.getProviderType(selectedModel);
      // 通过providerType和模型名关键字获取emoji
      function getModelEmoji(model, providerType) {
        // 优先模型名关键字
        for (const key in modelEmojiMap) {
          if (model.toLowerCase().includes(key)) return modelEmojiMap[key];
        }
        // 其次providerType
        if (modelEmojiMap[providerType]) return modelEmojiMap[providerType];
        return '';
      }
      const modelEmoji = getModelEmoji(selectedModel, providerType);

      // 处理思考模型（只要回答里有<think>标签就处理）
      if (/<think>[\s\S]*?<\/think>/.test(outputText)) {
        const thinkContent = outputText.match(/<think>([\s\S]*?)<\/think>/);
        const displayText = outputText
          .replace(/<think>[\s\S]*?<\/think>/g, "")
          .trim();

        embed = new EmbedBuilder()
          .setTitle(`${modelEmoji} AI Text Generation`)
          .setDescription(displayText)
          .setColor("#00ff00")
          .setFooter({
            text: `${modelEmoji} Powered by ${selectedModel} | ${today}：${usageInfo.usage}/${usageInfo.limit}`
          });

        // 处理生成的图像
        if (dataURI && dataURI.startsWith("data:image/jpeg;base64,")) {
          const imageResult = toolFunctions.processGeneratedImage(dataURI);
          if (imageResult.path) {
            embed.setDescription(outputText ? outputText : i18n.getString("commands.agent.imageGenerated", language));
            embed.setFooter({text: `Powered by ${selectedModel} with Flux-1 | ${today}：${usageInfo.usage}/${usageInfo.limit}`});
            await interaction.editReply({ embeds: [embed], files: [imageResult.attachment] });
            fs.unlinkSync(imageResult.path); // 删除临时文件
          }
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
          .setTitle(`${modelEmoji} AI Text Generation`)
          .setDescription(outputText)
          .setColor("#00ff00")
          .setFooter({
            text: `${modelEmoji} Powered by ${selectedModel} | ${today}：${usageInfo.usage}/${usageInfo.limit}`
          });

        // 处理生成的图像
        if (dataURI && dataURI.startsWith("data:image/jpeg;base64,")) {
          const imageResult = toolFunctions.processGeneratedImage(dataURI);
          if (imageResult.path) {
            embed.setDescription(outputText ? outputText : i18n.getString("commands.agent.imageGenerated", language));
            embed.setFooter({text: `Powered by ${selectedModel} with Flux-1 | ${today}：${usageInfo.usage}/${usageInfo.limit}`});
            await interaction.editReply({ embeds: [embed], files: [imageResult.attachment] });
            fs.unlinkSync(imageResult.path); // 删除临时文件
          }
        } else if (dataURI) {
          logger.error("Invalid dataURI format");
        }
      }

      // 添加搜索结果按钮
      if (searchResults && searchResults.length > 0) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId("showSearchResults")
            .setLabel(i18n.getString("commands.agent.showSearchResults", language))
            .setStyle(ButtonStyle.Secondary)
        );

        const searchFilter = i =>
          ["showSearchResults", "hideSearchResults"].includes(i.customId) &&
          i.user.id === interaction.user.id;

        if (interaction.channel) {
          // 在公开频道中
          const searchCollector = interaction.channel.createMessageComponentCollector({
            filter: searchFilter,
            time: 60000
          });
          
          searchCollector.on('collect', async i => {
            if (i.customId === "showSearchResults") {
              const maxLength = 1024;
              const searchResultsText = searchResults.map(result =>
                `**${result.title}**\n${result.url}\n${result.contentSnippet || ''}`
              ).join('\n\n');
      
              if (searchResultsText.length <= maxLength) {
                // 内容在限制内，直接加入embed
                embed.addFields({
                  name: i18n.getString("commands.agent.searchResults", language),
                  value: searchResultsText,
                  inline: false
                });
              } else {
                // 内容过长，建立新的embed
                const searchEmbed = new EmbedBuilder()
                  .setTitle(i18n.getString("commands.agent.fullsearchResults", language))
                  .setDescription(searchResultsText)
                  .setColor("#5865F2"); // Discord蓝色
      
                embed.addFields({
                  name: i18n.getString("commands.agent.searchResults", language),
                  value: searchResultsText,
                  inline: false
                });
      
                // 修改按钮
                row.components[0]
                  .setLabel(i18n.getString("commands.agent.hideSearchResults", language))
                  .setCustomId("hideSearchResults");
      
                await i.update({ embeds: [embed, searchEmbed], components: [row] });
                return;
              }
      
              row.components[0]
                .setLabel(i18n.getString("commands.agent.hideSearchResults", language))
                .setCustomId("hideSearchResults");
      
              await i.update({ embeds: [embed], components: [row] });
            } else if (i.customId === "hideSearchResults") {
              embed.spliceFields(0, 1);
      
              row.components[0]
                .setLabel(i18n.getString("commands.agent.showSearchResults", language))
                .setCustomId("showSearchResults");
      
              await i.update({ embeds: [embed], components: [row] });
            }
          });
        } else {
          // 在私聊环境中
          const searchCollector = interaction.user.createDM().then(dm => {
            return dm.createMessageComponentCollector({
              filter: searchFilter,
              time: 60000
            });
          });
        
          searchCollector.then(dmCollector => {
            dmCollector.on('collect', async i => {
              if (i.customId === "showSearchResults") {
                const maxLength = 1024;
                const searchResultsText = searchResults.map(result =>
                  `**${result.title}**\n${result.url}\n${result.contentSnippet || ''}`
                ).join('\n\n');
        
                if (searchResultsText.length <= maxLength) {
                  embed.addFields({
                    name: i18n.getString("commands.agent.searchResults", language),
                    value: searchResultsText,
                    inline: false
                  });
                } else {
                  const searchEmbed = new EmbedBuilder()
                    .setTitle("完整搜尋結果")
                    .setDescription(searchResultsText)
                    .setColor("#5865F2");
        
                  embed.addFields({
                    name: i18n.getString("commands.agent.searchResults", language),
                    value: i18n.getString("commands.agent.searchResultsTooLong", language),
                    inline: false
                  });
        
                  row.components[0]
                    .setLabel(i18n.getString("commands.agent.hideSearchResults", language))
                    .setCustomId("hideSearchResults");
        
                  await i.update({ embeds: [embed, searchEmbed], components: [row] });
                  return;
                }
        
                row.components[0]
                  .setLabel(i18n.getString("commands.agent.hideSearchResults", language))
                  .setCustomId("hideSearchResults");
        
                await i.update({ embeds: [embed], components: [row] });
              } else if (i.customId === "hideSearchResults") {
                embed.spliceFields(0, 1);

                row.components[0]
                  .setLabel(i18n.getString("commands.agent.showSearchResults", language))
                  .setCustomId("showSearchResults");
        
                await i.update({ embeds: [embed], components: [row] });
              }
            });
          });
        }
      }
      const searchenable = i18n.getString("commands.agent.search", language);
      const searchdisable = i18n.getString("commands.agent.searchdisable", language);
      const searchnotused = i18n.getString("commands.agent.searchnotused", language);

      // 添加联网搜索信息到页脚
      if (enableSearch) {
        if (actuallySearched) {
          if (dataURI && dataURI.startsWith("data:image/jpeg;base64,")) {
            embed.setFooter({
              text: `Powered by ${selectedModel} with Flux-1 | ${today}：${usageInfo.usage}/${usageInfo.limit} | 🔍 ${searchenable}`
            });
          } else {
            embed.setFooter({
              text: `Powered by ${selectedModel} | ${today}：${usageInfo.usage}/${usageInfo.limit} | 🔍 ${searchenable}`
            });
          }
        } else {
          if (dataURI && dataURI.startsWith("data:image/jpeg;base64,")) {
            embed.setFooter({
              text: `Powered by ${selectedModel} with Flux-1 | ${today}：${usageInfo.usage}/${usageInfo.limit} | 🔍 ${searchnotused}`
            });
          } else {
            embed.setFooter({
              text: `Powered by ${selectedModel} | ${today}：${usageInfo.usage}/${usageInfo.limit} | 🔍 ${searchnotused}`
            });
          }
        }
      } else {
        if (dataURI && dataURI.startsWith("data:image/jpeg;base64,")) {
          embed.setFooter({
            text: `Powered by ${selectedModel} with Flux-1 | ${today}：${usageInfo.usage}/${usageInfo.limit} | 🔍 ${searchdisable}`
          });
        } else {
          embed.setFooter({
            text: `Powered by ${selectedModel} | ${today}：${usageInfo.usage}/${usageInfo.limit} | 🔍 ${searchdisable}`
          });
        }
      }

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
      await memoryService.saveChatLogToMongo(
        userId, 
        selectedModel, 
        prompt, 
        outputText, 
        String(sentMessageId)
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