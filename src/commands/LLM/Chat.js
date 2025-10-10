const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./chatlog.db");
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const fs = require("fs");
const logger = require("../../utils/logger.js");
const crypto = require("crypto");
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
        const sysPrompt = llmService.getSystemPrompt(selectedModel, language);
        if (sysPrompt) messages.unshift(sysPrompt);
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
        
        // 支持多個工具調用
        if (calls && calls.length > 0) {
          logger.info(`檢測到 ${calls.length} 個工具調用: ${calls.map(t => t.function.name).join(', ')}`);
          
          for (const call of calls) {
            if (call.type === "function") {
              const parsed = JSON.parse(call.function.arguments);
              
              if (call.function.name === "generateImage") {
                dataURI = await toolFunctions.generateImageCloudflare(parsed.prompt);
                messages.push({
                  tool_call_id: call.id,
                  role: "tool",
                  name: call.function.name,
                  content: JSON.stringify({ generateResult: "已生成提示詞為 " + parsed.prompt + " 的圖片" })
                });
              } else if (call.function.name === "searchDuckDuckGo") {
                actuallySearched = true;
                
                const currentSearchResults = await toolFunctions.searchDuckDuckGoLite(parsed.query, parsed.numResults || 10);
                
                // 合併搜尋結果
                if (!searchResults) {
                  searchResults = [];
                }
                searchResults = searchResults.concat(currentSearchResults);
                
                if (currentSearchResults.length === 0) {
                  messages.push({
                    tool_call_id: call.id,
                    role: "tool",
                    name: call.function.name,
                    content: JSON.stringify({ searchResults: "No results found for: " + parsed.query })
                  });
                } else {
                  messages.push({
                    tool_call_id: call.id,
                    role: "tool",
                    name: call.function.name,
                    content: JSON.stringify({ searchResults: currentSearchResults })
                  });
                }
              }
            }
          }
          
          logger.info(`所有工具調用完成，合併搜尋結果數: ${searchResults?.length || 0}`);
          
          // 如果有搜尋調用，使用結果再次發送請求
          if (actuallySearched) {
            llmService.updateUserUsage(userId, selectedModel, usageLimits);

            response = await llmService.sendLLMRequest(messages, selectedModel, tools, client);
            
            // 處理第二輪可能的工具調用（例如生成圖片）
            if (
              response.body.choices &&
              response.body.choices[0].finish_reason === "tool_calls"
            ) {
              messages.push(response.body.choices[0].message);
              const secondCalls = response.body.choices[0].message.tool_calls;
              
              if (secondCalls && secondCalls.length > 0) {
                for (const call of secondCalls) {
                  if (call.type === "function") {
                    const parsed = JSON.parse(call.function.arguments);
                    if (call.function.name === "generateImage") {
                      dataURI = await toolFunctions.generateImageCloudflare(parsed.prompt);
                      messages.push({
                        tool_call_id: call.id,
                        role: "tool",
                        name: call.function.name,
                        content: JSON.stringify({generateResult: "已生成提示詞為 " + parsed.prompt + " 的圖片"})
                      });
                    }
                  }
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
        'gpt-4o': '<:gpt4o:1403243749236150435>',
        'gpt-4o-mini': '<:gpt4omini:1425123222902407198>',
        'gpt-4.1': '<:gpt4_1:1403243798536130642>',
        'gpt-4.1-mini': '<:gpt41mini:1425121129093267527>',
        'gpt-4.1-nano': '<:gpt41nano:1425121237142601749>',
        'gpt-5': '<:gpt5:1403242839214653603>',
        'gpt-5-chat': '<:gpt5chat:1425121355371905064>',
        'gpt-5-mini': '<:gpt5mini:1425121271242559569>',
        'gpt-5-nano': '<:gpt5nano:1425121335994224670>',
        'gpt-oss': '<:gptoss20b:1425121439773888644>',
        'o1': '<:o1:1425120921777213500>',
        'o1-preview': '<:o1preview:1425120996125446224>',
        'o1-mini': '<:o1mini:1425121008754626610>',
        'o3': '<:o3:1424711069770846321>',
        'o3-mini': '<:o3mini:1425121020469317703>',
        'o4': '<:o4mini:1403243776214040638>',
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
        if (!model) return '';
        const lowerModel = model.toLowerCase();

        // 1) 优先精确匹配完整模型名
        if (modelEmojiMap[lowerModel]) return modelEmojiMap[lowerModel];

        // 2) 再找同系列（以前綴匹配為主），選擇最長的匹配鍵以取得最精確的系列
        const candidates = Object.keys(modelEmojiMap).filter(key => {
          // 忽略空鍵與 providerType 鍵
          if (!key) return false;
          const k = key.toLowerCase();
          return lowerModel.startsWith(k) || k.startsWith(lowerModel);
        });

        if (candidates.length > 0) {
          // 選最長的 key（更具體）
          candidates.sort((a, b) => b.length - a.length);
          return modelEmojiMap[candidates[0]];
        }

        // 3) 最後嘗試 providerType 作為備援
        if (providerType && modelEmojiMap[providerType]) return modelEmojiMap[providerType];

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
          .setDescription(outputText || i18n.getString("commands.agent.noContent", language) || "無內容")
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
            try {
              // 立即 defer 以避免超時
              await i.deferUpdate().catch(err => {
                logger.error(`延遲更新失敗: ${err.message}`);
              });
              
              if (i.customId === "showSearchResults") {
                const maxFieldLength = 1024;
                const maxDescriptionLength = 4096;
                
                // 準備搜尋結果
                const searchResultsArray = searchResults.map(result =>
                  `**${result.title}**\n${result.url}\n${result.contentSnippet || ''}`
                );
                
                const searchResultsText = searchResultsArray.join('\n\n');
      
              if (searchResultsText.length <= maxFieldLength) {
                // 内容在限制内，直接加入embed field
                embed.addFields({
                  name: i18n.getString("commands.agent.searchResults", language),
                  value: searchResultsText,
                  inline: false
                });
                
                row.components[0]
                  .setLabel(i18n.getString("commands.agent.hideSearchResults", language))
                  .setCustomId("hideSearchResults");
      
                await i.message.edit({ embeds: [embed], components: [row] });
              } else if (searchResultsText.length <= maxDescriptionLength) {
                // 内容超過 field 限制但在 description 限制內，建立新的embed
                const searchEmbed = new EmbedBuilder()
                  .setTitle(i18n.getString("commands.agent.fullsearchResults", language))
                  .setDescription(searchResultsText)
                  .setColor("#5865F2");
      
                row.components[0]
                  .setLabel(i18n.getString("commands.agent.hideSearchResults", language))
                  .setCustomId("hideSearchResults");
      
                await i.message.edit({ embeds: [embed, searchEmbed], components: [row] });
              } else {
                // 内容過長，需要分頁處理
                const chunks = [];
                let currentChunk = '';
                
                for (const resultText of searchResultsArray) {
                  // 如果單個結果就超過限制，需要截斷
                  if (resultText.length > maxDescriptionLength) {
                    const truncated = resultText.substring(0, maxDescriptionLength - 50) + '\n...(內容過長已截斷)';
                    if (currentChunk.length + truncated.length + 2 > maxDescriptionLength) {
                      chunks.push(currentChunk);
                      currentChunk = truncated;
                    } else {
                      currentChunk += (currentChunk ? '\n\n' : '') + truncated;
                    }
                  } else if (currentChunk.length + resultText.length + 2 > maxDescriptionLength) {
                    // 當前塊放不下了，開始新塊
                    chunks.push(currentChunk);
                    currentChunk = resultText;
                  } else {
                    currentChunk += (currentChunk ? '\n\n' : '') + resultText;
                  }
                }
                
                if (currentChunk) {
                  chunks.push(currentChunk);
                }
                
                // 創建分頁embeds
                const searchEmbeds = chunks.map((chunk, index) => {
                  return new EmbedBuilder()
                    .setTitle(`${i18n.getString("commands.agent.fullsearchResults", language)} (${index + 1}/${chunks.length})`)
                    .setDescription(chunk)
                    .setColor("#5865F2");
                });
                
                row.components[0]
                  .setLabel(i18n.getString("commands.agent.hideSearchResults", language))
                  .setCustomId("hideSearchResults");
      
                // 顯示第一頁，最多顯示3個embeds（Discord限制10個embeds，但我們已經有主embed）
                const embedsToShow = [embed, ...searchEmbeds.slice(0, Math.min(3, searchEmbeds.length))];
                
                if (searchEmbeds.length > 3) {
                  // 添加提示信息
                  const infoEmbed = new EmbedBuilder()
                    .setDescription(`⚠️ 搜尋結果過多，僅顯示前 ${Math.min(3, searchEmbeds.length)} 頁，共 ${searchEmbeds.length} 頁`)
                    .setColor("#FFA500");
                  embedsToShow.push(infoEmbed);
                }
                
                await i.message.edit({ embeds: embedsToShow, components: [row] });
              }
            } else if (i.customId === "hideSearchResults") {
              // 移除所有搜尋結果相關的 embeds 和 fields
              const fieldsToRemove = embed.data.fields?.findIndex(f => 
                f.name === i18n.getString("commands.agent.searchResults", language)
              );
              
              if (fieldsToRemove !== undefined && fieldsToRemove >= 0) {
                embed.spliceFields(fieldsToRemove, 1);
              }
      
              row.components[0]
                .setLabel(i18n.getString("commands.agent.showSearchResults", language))
                .setCustomId("showSearchResults");
      
              await i.message.edit({ embeds: [embed], components: [row] });
            }
          } catch (error) {
            logger.error(`處理搜尋結果按鈕時出錯: ${error.message}`);
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