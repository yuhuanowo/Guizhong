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
      let videoUrl = null; // 添加視頻 URL 變量
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
                
                // 為每個搜尋結果添加搜尋引擎標記
                const markedResults = currentSearchResults.map(r => ({
                  ...r,
                  searchEngine: 'duckduckgo'
                }));
                
                // 合併搜尋結果
                if (!searchResults) {
                  searchResults = [];
                }
                searchResults = searchResults.concat(markedResults);
                
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
              } else if (call.function.name === "tavilySearch") {
                actuallySearched = true;
                logger.info(`執行 Tavily Search: ${parsed.query}`);
                
                try {
                  const tavilyResults = await toolFunctions.tavilySearch(parsed);
                  
                  // 格式化 Tavily 結果以便顯示，並添加搜尋引擎標記
                  const formattedResults = tavilyResults.results?.map(r => ({
                    title: r.title,
                    url: r.url,
                    contentSnippet: r.content,
                    domain: new URL(r.url).hostname,
                    icon: r.favicon || `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(new URL(r.url).hostname)}`,
                    searchEngine: 'tavily'
                  })) || [];
                  
                  if (!searchResults) {
                    searchResults = [];
                  }
                  searchResults = searchResults.concat(formattedResults);
                  
                  // 構建回應內容
                  let responseContent = {
                    searchResults: tavilyResults.results || [],
                    totalResults: tavilyResults.results?.length || 0
                  };
                  
                  // 如果有 LLM 生成的答案，也包含進去
                  if (tavilyResults.answer) {
                    responseContent.answer = tavilyResults.answer;
                  }
                  
                  messages.push({
                    tool_call_id: call.id,
                    role: "tool",
                    name: call.function.name,
                    content: JSON.stringify(responseContent)
                  });
                  
                  logger.success(`Tavily Search 完成，找到 ${formattedResults.length} 個結果`);
                } catch (error) {
                  logger.error(`Tavily Search 錯誤: ${error.message}`);
                  messages.push({
                    tool_call_id: call.id,
                    role: "tool",
                    name: call.function.name,
                    content: JSON.stringify({ 
                      error: `Tavily 搜尋失敗: ${error.message}`,
                      searchResults: []
                    })
                  });
                }
              } else if (call.function.name === "tavilyExtract") {
                logger.info(`執行 Tavily Extract: ${Array.isArray(parsed.urls) ? parsed.urls.length : 1} 個 URL`);
                
                try {
                  const extractResults = await toolFunctions.tavilyExtract(parsed);
                  
                  messages.push({
                    tool_call_id: call.id,
                    role: "tool",
                    name: call.function.name,
                    content: JSON.stringify({
                      success: extractResults.results?.length || 0,
                      failed: extractResults.failed_results?.length || 0,
                      results: extractResults.results || [],
                      failed_results: extractResults.failed_results || []
                    })
                  });
                  
                  logger.success(`Tavily Extract 完成，成功: ${extractResults.results?.length || 0}, 失敗: ${extractResults.failed_results?.length || 0}`);
                } catch (error) {
                  logger.error(`Tavily Extract 錯誤: ${error.message}`);
                  messages.push({
                    tool_call_id: call.id,
                    role: "tool",
                    name: call.function.name,
                    content: JSON.stringify({ 
                      error: `Tavily 提取失敗: ${error.message}`,
                      results: []
                    })
                  });
                }
              } else if (call.function.name === "tavilyCrawl") {
                logger.info(`執行 Tavily Crawl: ${parsed.url}`);
                
                try {
                  const crawlResults = await toolFunctions.tavilyCrawl(parsed);
                  
                  messages.push({
                    tool_call_id: call.id,
                    role: "tool",
                    name: call.function.name,
                    content: JSON.stringify({
                      base_url: crawlResults.base_url,
                      totalPages: crawlResults.results?.length || 0,
                      results: crawlResults.results || []
                    })
                  });
                  
                  logger.success(`Tavily Crawl 完成，爬取 ${crawlResults.results?.length || 0} 個頁面`);
                } catch (error) {
                  logger.error(`Tavily Crawl 錯誤: ${error.message}`);
                  messages.push({
                    tool_call_id: call.id,
                    role: "tool",
                    name: call.function.name,
                    content: JSON.stringify({ 
                      error: `Tavily 爬取失敗: ${error.message}`,
                      results: []
                    })
                  });
                }
              } else if (call.function.name === "tavilyMap") {
                logger.info(`執行 Tavily Map: ${parsed.url}`);
                
                try {
                  const mapResults = await toolFunctions.tavilyMap(parsed);
                  
                  messages.push({
                    tool_call_id: call.id,
                    role: "tool",
                    name: call.function.name,
                    content: JSON.stringify({
                      base_url: mapResults.base_url,
                      totalUrls: mapResults.results?.length || 0,
                      urls: mapResults.results || []
                    })
                  });
                  
                  logger.success(`Tavily Map 完成，發現 ${mapResults.results?.length || 0} 個 URL`);
                } catch (error) {
                  logger.error(`Tavily Map 錯誤: ${error.message}`);
                  messages.push({
                    tool_call_id: call.id,
                    role: "tool",
                    name: call.function.name,
                    content: JSON.stringify({ 
                      error: `Tavily 地圖生成失敗: ${error.message}`,
                      urls: []
                    })
                  });
                }
              } else if (call.function.name === "generateImageZhipu") {
                try {
                  const imageResult = await toolFunctions.generateImageZhipu(parsed);
                  
                  // 下載圖片並轉換為 dataURI
                  const imageResponse = await fetch(imageResult.imageUrl);
                  const imageBuffer = await imageResponse.buffer();
                  const base64Image = imageBuffer.toString('base64');
                  dataURI = `data:image/jpeg;base64,${base64Image}`;
                  
                    // 回傳給 LLM 的工具結果：僅回報成功與提示詞，不包含外部圖片 URL
                    messages.push({
                      tool_call_id: call.id,
                      role: "tool",
                      name: call.function.name,
                      content: JSON.stringify({ 
                        generateResult: i18n.getString("commands.agent.zhipuImageGenerated", language),
                        prompt: parsed.prompt
                      })
                    });
                } catch (error) {
                  logger.error(`Zhipu AI 圖像生成錯誤: ${error.message}`);
                  messages.push({
                    tool_call_id: call.id,
                    role: "tool",
                    name: call.function.name,
                    content: JSON.stringify({ 
                      error: i18n.getString("commands.agent.zhipuImageFailed", language) + `: ${error.message}`
                    })
                  });
                }
              } else if (call.function.name === "generateVideoZhipu") {
                try {
                  const videoResult = await toolFunctions.generateVideoZhipu(parsed);
                  
                  // 自動輪詢查詢結果，最多等待 5 分鐘
                  const maxAttempts = 30; // 30 次 x 10 秒 = 5 分鐘
                  let attempts = 0;
                  let finalResult = null;
                  
                  while (attempts < maxAttempts) {
                    attempts++;
                    
                    // 等待 10 秒再查詢
                    await new Promise(resolve => setTimeout(resolve, 10000));
                    
                    try {
                      const queryResult = await toolFunctions.queryVideoResultZhipu(videoResult.taskId);
                      
                      if (queryResult.task_status === "SUCCESS") {
                        finalResult = queryResult;
                        break;
                      } else if (queryResult.task_status === "FAIL") {
                        throw new Error(queryResult.error?.message || i18n.getString("commands.agent.zhipuVideoFailed", language));
                      }
                      // 如果是 PROCESSING，繼續循環
                    } catch (queryError) {
                      logger.error(`查詢視頻結果錯誤: ${queryError.message}`);
                      throw queryError;
                    }
                  }
                  
                  if (finalResult && finalResult.task_status === "SUCCESS") {
                    const generatedVideoUrl = finalResult.video_result?.[0]?.url || null;
                    const coverImageUrl = finalResult.video_result?.[0]?.cover_image_url || null;
                    
                    // 下載視頻文件
                    if (generatedVideoUrl) {
                      const videoResponse = await fetch(generatedVideoUrl);
                      const videoBuffer = await videoResponse.buffer();
                      
                      // 保存到臨時文件
                      const tempVideoPath = `./recordings/${crypto.randomUUID()}.mp4`;
                      fs.writeFileSync(tempVideoPath, videoBuffer);
                      
                      // 保存視頻路徑以便後續發送
                      videoUrl = tempVideoPath;
                    }
                    
                    // 回傳給 LLM 的工具結果：不要包含本地檔案或外部下載連結，只返回 taskId/taskStatus/prompt
                    messages.push({
                      tool_call_id: call.id,
                      role: "tool",
                      name: call.function.name,
                      content: JSON.stringify({ 
                        generateResult: i18n.getString("commands.agent.zhipuVideoGenerated", language),
                        taskId: videoResult.taskId,
                        taskStatus: "SUCCESS",
                        model: finalResult.model,
                        prompt: parsed.prompt
                      })
                    });
                  } else {
                    // 超時未完成
                    messages.push({
                      tool_call_id: call.id,
                      role: "tool",
                      name: call.function.name,
                      content: JSON.stringify({ 
                        generateResult: i18n.getString("commands.agent.zhipuVideoTimeout", language),
                        taskId: videoResult.taskId,
                        taskStatus: "TIMEOUT",
                        model: videoResult.model,
                        prompt: parsed.prompt
                      })
                    });
                  }
                } catch (error) {
                  logger.error(`Zhipu AI 視頻生成錯誤: ${error.message}`);
                  messages.push({
                    tool_call_id: call.id,
                    role: "tool",
                    name: call.function.name,
                    content: JSON.stringify({ 
                      error: i18n.getString("commands.agent.zhipuVideoFailed", language) + `: ${error.message}`
                    })
                  });
                }
              } else if (call.function.name === "queryVideoResultZhipu") {
                logger.info(`查詢Zhipu AI 視頻任務: ${parsed.taskId}`);
                
                try {
                  const queryResult = await toolFunctions.queryVideoResultZhipu(parsed.taskId);
                  
                  let resultMessage = {
                    taskId: queryResult.id,
                    taskStatus: queryResult.task_status,
                    model: queryResult.model
                  };
                  
                  if (queryResult.task_status === "SUCCESS") {
                    resultMessage.videoUrl = queryResult.video_result?.[0]?.url || null;
                    resultMessage.coverImageUrl = queryResult.video_result?.[0]?.cover_image_url || null;
                    resultMessage.message = "Video generated successfully";
                  } else if (queryResult.task_status === "PROCESSING") {
                    resultMessage.message = "Video is being generated, please check again later...";
                  } else if (queryResult.task_status === "FAIL") {
                    resultMessage.message = "Video generation failed";
                    resultMessage.error = queryResult.error || "Unknown error";
                  }
                  
                  messages.push({
                    tool_call_id: call.id,
                    role: "tool",
                    name: call.function.name,
                    content: JSON.stringify(resultMessage)
                  });
                  
                  logger.success(`Zhipu AI 視頻任務查詢完成: ${queryResult.task_status}`);
                } catch (error) {
                  logger.error(`Zhipu AI 視頻任務查詢錯誤: ${error.message}`);
                  messages.push({
                    tool_call_id: call.id,
                    role: "tool",
                    name: call.function.name,
                    content: JSON.stringify({ 
                      error: `Video task query failed: ${error.message}`
                    })
                  });
                }
              }
            }

            // 如果上面的邏輯沒有為該 call.id 推送任何 tool 訊息，插入一個預設的錯誤回應以滿足 LLM 的驗證要求
            if (!messages.some(m => m.tool_call_id === call.id)) {
              messages.push({
                tool_call_id: call.id,
                role: "tool",
                name: (call.function && call.function.name) || call.name || "unknown",
                content: JSON.stringify({ error: `No handler implemented for tool call ${call.function ? call.function.name : call.name || call.id}` })
              });
            }
          }
          
          logger.info(`所有工具調用完成，合併搜尋結果數: ${searchResults?.length || 0}`);
          
          // 工具調用完成後，再次發送請求獲得最終回應
          llmService.updateUserUsage(userId, selectedModel, usageLimits);
          response = await llmService.sendLLMRequest(messages, selectedModel, tools, client);
          
          // 處理第二輪可能的工具調用（例如搜尋後再生成圖片或視頻）
          if (
            response.body.choices &&
            response.body.choices[0].finish_reason === "tool_calls"
          ) {
            messages.push(response.body.choices[0].message);
            const secondCalls = response.body.choices[0].message.tool_calls;
            
            if (secondCalls && secondCalls.length > 0) {
              logger.info(`第二輪檢測到 ${secondCalls.length} 個工具調用: ${secondCalls.map(t => t.function.name).join(', ')}`);
              
              for (const call of secondCalls) {
                if (call.type === "function") {
                  const parsed = JSON.parse(call.function.arguments);
                  
                  if (call.function.name === "generateImage") {
                    dataURI = await toolFunctions.generateImageCloudflare(parsed.prompt);
                    messages.push({
                      tool_call_id: call.id,
                      role: "tool",
                      name: call.function.name,
                      content: JSON.stringify({generateResult: "Image generated with prompt: " + parsed.prompt})
                    });
                  } else if (call.function.name === "generateImageZhipu") {
                    try {
                      const imageResult = await toolFunctions.generateImageZhipu(parsed);
                      
                      // 下載圖片並轉換為 dataURI
                      const imageResponse = await fetch(imageResult.imageUrl);
                      const imageBuffer = await imageResponse.buffer();
                      const base64Image = imageBuffer.toString('base64');
                      dataURI = `data:image/jpeg;base64,${base64Image}`;
                      
                      messages.push({
                        tool_call_id: call.id,
                        role: "tool",
                        name: call.function.name,
                        content: JSON.stringify({ 
                          generateResult: i18n.getString("commands.agent.zhipuImageGenerated", language),
                          imageUrl: imageResult.imageUrl,
                          created: imageResult.created
                        })
                      });
                    } catch (error) {
                      logger.error(`Zhipu AI 圖像生成錯誤: ${error.message}`);
                      messages.push({
                        tool_call_id: call.id,
                        role: "tool",
                        name: call.function.name,
                        content: JSON.stringify({ 
                          error: i18n.getString("commands.agent.zhipuImageFailed", language) + `: ${error.message}`
                        })
                      });
                    }
                  } else if (call.function.name === "generateVideoZhipu") {
                    try {
                      const videoResult = await toolFunctions.generateVideoZhipu(parsed);
                      
                      // 自動輪詢查詢結果，最多等待 5 分鐘
                      const maxAttempts = 30;
                      let attempts = 0;
                      let finalResult = null;
                      
                      while (attempts < maxAttempts) {
                        attempts++;
                        await new Promise(resolve => setTimeout(resolve, 10000));
                        
                        try {
                          const queryResult = await toolFunctions.queryVideoResultZhipu(videoResult.taskId);
                          
                          if (queryResult.task_status === "SUCCESS") {
                            finalResult = queryResult;
                            break;
                          } else if (queryResult.task_status === "FAIL") {
                            throw new Error(queryResult.error?.message || i18n.getString("commands.agent.zhipuVideoFailed", language));
                          }
                        } catch (queryError) {
                          logger.error(`查詢視頻結果錯誤: ${queryError.message}`);
                          throw queryError;
                        }
                      }
                      
                      if (finalResult && finalResult.task_status === "SUCCESS") {
                        const generatedVideoUrl = finalResult.video_result?.[0]?.url || null;
                        
                        // 下載視頻文件
                        if (generatedVideoUrl) {
                          const videoResponse = await fetch(generatedVideoUrl);
                          const videoBuffer = await videoResponse.buffer();
                          const tempVideoPath = `./recordings/${crypto.randomUUID()}.mp4`;
                          fs.writeFileSync(tempVideoPath, videoBuffer);
                          videoUrl = tempVideoPath;
                        }
                        
                        // 回傳給 LLM 的工具結果：不要包含本地檔案路徑，僅回報 task 信息與提示詞
                        messages.push({
                          tool_call_id: call.id,
                          role: "tool",
                          name: call.function.name,
                          content: JSON.stringify({ 
                            generateResult: i18n.getString("commands.agent.zhipuVideoGenerated", language),
                            taskId: videoResult.taskId,
                            taskStatus: "SUCCESS",
                            model: finalResult.model,
                            prompt: parsed.prompt
                          })
                        });
                      } else {
                        messages.push({
                          tool_call_id: call.id,
                          role: "tool",
                          name: call.function.name,
                          content: JSON.stringify({ 
                            generateResult: i18n.getString("commands.agent.zhipuVideoTimeout", language),
                            taskId: videoResult.taskId,
                            taskStatus: "TIMEOUT"
                          })
                        });
                      }
                    } catch (error) {
                      logger.error(`Zhipu AI 視頻生成錯誤: ${error.message}`);
                      messages.push({
                        tool_call_id: call.id,
                        role: "tool",
                        name: call.function.name,
                        content: JSON.stringify({ 
                          error: i18n.getString("commands.agent.zhipuVideoFailed", language) + `: ${error.message}`
                        })
                      });
                    }
                    }

                    // 第二輪也要保底：若未為該 call.id 推送 tool 訊息，插入預設回應
                    if (!messages.some(m => m.tool_call_id === call.id)) {
                      messages.push({
                        tool_call_id: call.id,
                        role: "tool",
                        name: (call.function && call.function.name) || call.name || "unknown",
                        content: JSON.stringify({ error: `No handler implemented for tool call ${call.function ? call.function.name : call.name || call.id}` })
                      });
                    }
                }
              }
              
              // 第二輪工具調用完成後，再次發送請求獲得最終回應
              llmService.updateUserUsage(userId, selectedModel, usageLimits);
              response = await llmService.sendLLMRequest(messages, selectedModel, tools, client);
            }
          }

          if (response.status !== "200") {
            throw response.body.error;
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
            text: `Powered by ${selectedModel} | ${today}：${usageInfo.usage}/${usageInfo.limit}`
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
          embed.setFooter({text: `Powered by ${selectedModel} with CogVideoX-Flash | ${today}：${usageInfo.usage}/${usageInfo.limit}`});
          
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
            text: `Powered by ${selectedModel} | ${today}：${usageInfo.usage}/${usageInfo.limit}`
          });

        // 处理生成的图像
        if (dataURI && dataURI.startsWith("data:image/jpeg;base64,")) {
          const imageResult = toolFunctions.processGeneratedImage(dataURI);
          if (imageResult.path) {
            const filename = path.basename(imageResult.path);
            embed.setDescription(outputText ? outputText : i18n.getString("commands.agent.imageGenerated", language));
            embed.setImage(`attachment://${filename}`);
            embed.setFooter({text: `Powered by ${selectedModel} with Flux-1 | ${today}：${usageInfo.usage}/${usageInfo.limit}`});
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
          embed.setFooter({text: `Powered by ${selectedModel} with CogVideoX-Flash | ${today}：${usageInfo.usage}/${usageInfo.limit}`});
          
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