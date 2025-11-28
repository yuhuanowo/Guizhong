/**
 * LLM Service - 统一的LLM接口
 * 支持多个LLM提供商：GitHub Model、Google AI Studio Gemini、Ollama、Groq、OpenRouter、Yunmo
 */
const fs = require("fs");
const fetch = require("node-fetch");
const crypto = require("crypto");
const logger = require("../../../utils/logger.js");
const config = require("../../../config.js");
const i18n = require("../../../utils/i18n");

// 导入各个提供商的服务
const githubModelProvider = require("./providers/githubModelProvider");
const geminiProvider = require("./providers/geminiProvider");
const ollamaProvider = require("./providers/ollamaProvider");
const groqProvider = require("./providers/groqProvider");
const openRouterProvider = require("./providers/openRouterProvider");
const yunmoProvider = require("./providers/yunmoProvider");
const zhipuProvider = require("./providers/zhipuProvider");

// 导入工具函数和配置
const toolFunctions = require("./toolFunctions");
const { getToolDefinitions } = toolFunctions;
const llmConfig = require("./llmConfig");

// 用于存储用户使用量的路径
const usagePath = "./src/JSON/chatgptusage.json";

/**
 * 获取模型的提供商类型
 * @param {string} modelName 模型名称
 * @returns {string} 提供商类型
 */
function getProviderType(modelName) {
  // 根据模型名称判断提供商
  if (llmConfig.githubModels.includes(modelName)) return "github";
  if (llmConfig.geminiModels.includes(modelName)) return "gemini";
  if (llmConfig.ollamaModels.includes(modelName)) return "ollama";
  if (llmConfig.groqModels.includes(modelName)) return "groq";
  if (llmConfig.openRouterModels.includes(modelName)) return "openrouter";
  if (llmConfig.yunmoModels.includes(modelName)) return "yunmo";
  if (llmConfig.zhipuModels.includes(modelName)) return "zhipu";
  
  // 默认返回GitHub Model
  logger.warn(`未知模型: ${modelName}，默认使用GitHub Model处理`);
  return "github";
}

/**
 * 更新用户使用量
 * @param {string} userId 用户ID
 * @param {string} modelName 模型名称
 * @param {Object} usageLimits 使用限制
 * @returns {Object} 更新后的使用量信息
 */
function updateUserUsage(userId, modelName, usageLimits) {
  try {
    let userUsage = {};
    if (fs.existsSync(usagePath)) {
      userUsage = JSON.parse(fs.readFileSync(usagePath));
    }
    
    const currentDate = new Date().toISOString().split("T")[0];
    
    // 初始化使用者的使用记录
    if (!userUsage.date || userUsage.date !== currentDate) userUsage = { date: currentDate };
    if (!userUsage[userId]) userUsage[userId] = {};
    
    // 如果未指定模型，根据gpt-5-mini的使用量决定使用哪个模型
    if (!modelName) {
      if (userUsage[userId]["gpt-5-mini"] > usageLimits["gpt-5-mini"] - 5) {
        modelName = "gpt-4.1-mini";
      } else {
        modelName = "gpt-5-mini";
      }
    }
    
    if (!userUsage[userId][modelName]) userUsage[userId][modelName] = 0;
    userUsage[userId][modelName]++;
    fs.writeFileSync(usagePath, JSON.stringify(userUsage, null, 2));

    return {
      selectedModel: modelName,
      usage: userUsage[userId][modelName],
      limit: usageLimits[modelName] || 10,  // 如果没有指定限制，默认为10
      isExceeded: userUsage[userId][modelName] > (usageLimits[modelName] || 10)
    };
  } catch (error) {
    logger.error(`更新用户使用量出错: ${error.message}`);
    return {
      selectedModel: modelName || "gpt-5-mini",
      usage: 1,
      limit: usageLimits[modelName || "gpt-5-mini"] || 10,
      isExceeded: false
    };
  }
}

/**
 * 获取系统提示
 * @param {string} modelName 模型名称
 * @param {string} language 语言
 * @returns {Object} 系统提示对象
 */
function getSystemPrompt(modelName, language) {
  // 根据不同语言设置不同的提示语
  const prompts = llmConfig.systemPrompts;
  
  // 获取提供商类型
  const providerType = getProviderType(modelName);
  
  // 调用对应提供商的系统提示获取函数
  switch (providerType) {
    case "yunmo":
      return null;
    case "github":
      return githubModelProvider.getSystemPrompt(modelName, language, prompts);
    case "gemini":
      return geminiProvider.getSystemPrompt(language, prompts);
    case "ollama":
      return ollamaProvider.getSystemPrompt(modelName, language, prompts);
    case "groq":
      return groqProvider.getSystemPrompt(language, prompts);
    case "openrouter":
      return openRouterProvider.getSystemPrompt(modelName, language, prompts);
    case "zhipu":
      return zhipuProvider.getSystemPrompt(modelName, language, prompts);
    default:
      return { role: "system", content: prompts[language] || prompts['zh-TW'] };
  }
}

/**
 * 获取LLM工具定义
 * @param {boolean} enableSearch 是否启用搜索
 * @returns {Array} 工具定义数组
 */


/**
 * 创建LLM客户端
 * @param {string} modelName 模型名称
 * @returns {Object} LLM客户端
 */
function createLLMClient(modelName) {
  const providerType = getProviderType(modelName || "gpt-5-nano");
  
  switch (providerType) {
    case "github":
      return githubModelProvider.createClient(config.githubToken);
    case "gemini":
      // 優先使用 geminiApiKeys 陣列，若無則使用 geminiApiKey（支援逗號分隔的多 Key）
      const geminiKeys = config.geminiApiKeys && config.geminiApiKeys.length > 0 
        ? config.geminiApiKeys 
        : config.geminiApiKey;
      return geminiProvider.createClient(geminiKeys);
    case "ollama":
      return ollamaProvider.createClient(config.ollamaEndpoint);
    case "groq":
      return groqProvider.createClient(config.groqApiKey);
    case "openrouter":
      return openRouterProvider.createClient(config.openRouterApiKey);
    case "yunmo":
      return yunmoProvider.createClient(config.yunmoApiKey, config.yunmoApiEndpoint);
    case "zhipu":
      return zhipuProvider.createClient(config.zhipuApiKey);
    default:
      return githubModelProvider.createClient(config.githubToken);
  }
}

/**
 * 处理用户消息格式
 * @param {string} prompt 用户提示
 * @param {Object} image 图片附件
 * @param {Object} audio 音频附件
 * @param {string} modelName 模型名称
 * @returns {Promise<Array>} 格式化后的用户消息
 */
async function formatUserMessage(prompt, image, audio, modelName) {
  const providerType = getProviderType(modelName);
  
  switch (providerType) {
    case "github":
      return await githubModelProvider.formatUserMessage(prompt, image, audio, modelName);
    case "gemini":
      return await geminiProvider.formatUserMessage(prompt, image, audio);
    case "ollama":
      return await ollamaProvider.formatUserMessage(prompt, image);
    case "groq":
      return await groqProvider.formatUserMessage(prompt, image);
    case "openrouter":
      return await openRouterProvider.formatUserMessage(prompt, image, modelName);
    case "yunmo":
      return await yunmoProvider.formatUserMessage({ role: "user", content: prompt }, modelName);
    case "zhipu":
      return await zhipuProvider.formatUserMessage(prompt, image, audio, modelName);
    default:
      return [{ role: "user", content: prompt }];
  }
}

/**
 * 发送LLM请求
 * @param {Array} messages 消息数组
 * @param {string} modelName 模型名称
 * @param {Array} tools 工具数组
 * @param {Object} client LLM客户端
 * @returns {Promise<Object>} 响应结果
 */
async function sendLLMRequest(messages, modelName, tools, client) {
  const providerType = getProviderType(modelName);
  
  try {
    switch (providerType) {
      case "github":
        return await githubModelProvider.sendRequest(messages, modelName, tools, client);
      case "gemini":
        return await geminiProvider.sendRequest(messages, modelName, tools, client);
      case "ollama":
        return await ollamaProvider.sendRequest(messages, modelName, tools, client);
      case "groq":
        return await groqProvider.sendRequest(messages, modelName, tools, client);
      case "openrouter":
        return await openRouterProvider.sendRequest(messages, modelName, tools, client);
      case "yunmo":
        return await yunmoProvider.sendRequest(messages, modelName, tools, client);
      case "zhipu":
        return await zhipuProvider.sendRequest(messages, modelName, tools, client);
      default:
        return await githubModelProvider.sendRequest(messages, modelName, tools, client);
    }
  } catch (error) {
    logger.error(`发送LLM请求出错: ${error.message}`);
    throw error;
  }
}

/**
 * 获取模型的使用限制
 * @returns {Object} 模型使用限制
 */
function getModelUsageLimits() {
  return llmConfig.modelUsageLimits;
}

/**
 * 获取所有可用模型列表
 * @returns {Array<Object>} 模型列表，每个模型包含name和value
 */
function getAllAvailableModels() {
  return llmConfig.availableModels;
}

/**
 * 处理工具调用
 * @param {Array} calls 工具调用数组
 * @param {string} language 语言代码
 * @returns {Promise<Object>} 处理结果，包含 messages, searchResults, dataURI, videoUrl, remoteVideoUrl, actuallySearched
 */
async function handleToolCalls(calls, language) {
  const messages = [];
  let searchResults = null;
  let dataURI = null;
  let videoUrl = null;
  let remoteVideoUrl = null; // 遠程視頻 URL，用於保存到數據庫
  let actuallySearched = false;
  let toolUsed = null;

  if (!calls || calls.length === 0) {
    return { messages, searchResults, dataURI, videoUrl, remoteVideoUrl, actuallySearched, toolUsed };
  }

  logger.info(`检测到 ${calls.length} 个工具调用: ${calls.map(t => t.function.name).join(', ')}`);

  for (const call of calls) {
    if (call.type !== "function") continue;

    const parsed = JSON.parse(call.function.arguments);
    const functionName = call.function.name;

    try {
      if (functionName === "generateImage") {
        // Cloudflare Image Generation
        toolUsed = "flux";
        dataURI = await toolFunctions.generateImageCloudflare(parsed.prompt);
        messages.push({
          tool_call_id: call.id,
          role: "tool",
          name: functionName,
          content: JSON.stringify({ generateResult: "已生成提示词为 " + parsed.prompt + " 的图片" })
        });
      } else if (functionName === "searchDuckDuckGo") {
        // DuckDuckGo Search
        actuallySearched = true;
        const currentSearchResults = await toolFunctions.searchDuckDuckGoLite(parsed.query, parsed.numResults || 10);
        
        const markedResults = currentSearchResults.map(r => ({
          ...r,
          searchEngine: 'duckduckgo'
        }));
        
        if (!searchResults) searchResults = [];
        searchResults = searchResults.concat(markedResults);
        
        messages.push({
          tool_call_id: call.id,
          role: "tool",
          name: functionName,
          content: JSON.stringify({ 
            searchResults: currentSearchResults.length > 0 ? currentSearchResults : "No results found for: " + parsed.query 
          })
        });
      } else if (functionName === "tavilySearch") {
        // Tavily Search
        actuallySearched = true;
        logger.info(`执行 Tavily Search: ${parsed.query}`);
        
        const tavilyResults = await toolFunctions.tavilySearch(parsed);
        
        const formattedResults = tavilyResults.results?.map(r => ({
          title: r.title,
          url: r.url,
          contentSnippet: r.content,
          domain: new URL(r.url).hostname,
          icon: r.favicon || `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(new URL(r.url).hostname)}`,
          searchEngine: 'tavily'
        })) || [];
        
        if (!searchResults) searchResults = [];
        searchResults = searchResults.concat(formattedResults);
        
        let responseContent = {
          searchResults: tavilyResults.results || [],
          totalResults: tavilyResults.results?.length || 0
        };
        
        if (tavilyResults.answer) {
          responseContent.answer = tavilyResults.answer;
        }
        
        messages.push({
          tool_call_id: call.id,
          role: "tool",
          name: functionName,
          content: JSON.stringify(responseContent)
        });
        
        logger.success(`Tavily Search 完成，找到 ${formattedResults.length} 个结果`);
      } else if (functionName === "tavilyExtract") {
        // Tavily Extract
        logger.info(`执行 Tavily Extract: ${Array.isArray(parsed.urls) ? parsed.urls.length : 1} 个 URL`);
        const extractResults = await toolFunctions.tavilyExtract(parsed);
        
        messages.push({
          tool_call_id: call.id,
          role: "tool",
          name: functionName,
          content: JSON.stringify({
            success: extractResults.results?.length || 0,
            failed: extractResults.failed_results?.length || 0,
            results: extractResults.results || [],
            failed_results: extractResults.failed_results || []
          })
        });
        
        logger.success(`Tavily Extract 完成，成功: ${extractResults.results?.length || 0}, 失败: ${extractResults.failed_results?.length || 0}`);
      } else if (functionName === "tavilyCrawl") {
        // Tavily Crawl
        logger.info(`执行 Tavily Crawl: ${parsed.url}`);
        const crawlResults = await toolFunctions.tavilyCrawl(parsed);
        
        messages.push({
          tool_call_id: call.id,
          role: "tool",
          name: functionName,
          content: JSON.stringify({
            base_url: crawlResults.base_url,
            totalPages: crawlResults.results?.length || 0,
            results: crawlResults.results || []
          })
        });
        
        logger.success(`Tavily Crawl 完成，爬取 ${crawlResults.results?.length || 0} 个页面`);
      } else if (functionName === "tavilyMap") {
        // Tavily Map
        logger.info(`执行 Tavily Map: ${parsed.url}`);
        const mapResults = await toolFunctions.tavilyMap(parsed);
        
        messages.push({
          tool_call_id: call.id,
          role: "tool",
          name: functionName,
          content: JSON.stringify({
            base_url: mapResults.base_url,
            totalUrls: mapResults.results?.length || 0,
            urls: mapResults.results || []
          })
        });
        
        logger.success(`Tavily Map 完成，发现 ${mapResults.results?.length || 0} 个 URL`);
      } else if (functionName === "generateImageZhipu") {
        // Zhipu Image Generation
        toolUsed = "zhipu-cogview";
        const imageResult = await toolFunctions.generateImageZhipu(parsed);
        
        // 下载图片并转换为 dataURI
        const imageResponse = await fetch(imageResult.imageUrl);
        const imageBuffer = await imageResponse.buffer();
        const base64Image = imageBuffer.toString('base64');
        dataURI = `data:image/jpeg;base64,${base64Image}`;
        
        messages.push({
          tool_call_id: call.id,
          role: "tool",
          name: functionName,
          content: JSON.stringify({ 
            generateResult: i18n.getString("commands.agent.zhipuImageGenerated", language),
            prompt: parsed.prompt
          })
        });
      } else if (functionName === "generateVideoZhipu") {
        // Zhipu Video Generation
        toolUsed = "zhipu-cogvideo";
        const videoResult = await toolFunctions.generateVideoZhipu(parsed);
        
        // 自动轮询查询结果，最多等待 5 分钟
        const maxAttempts = 30; // 30 次 x 10 秒 = 5 分钟
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
            logger.error(`查询视频结果错误: ${queryError.message}`);
            throw queryError;
          }
        }
        
        if (finalResult && finalResult.task_status === "SUCCESS") {
          const generatedVideoUrl = finalResult.video_result?.[0]?.url || null;
          
          if (generatedVideoUrl) {
            // 保存遠程視頻 URL 用於數據庫
            remoteVideoUrl = generatedVideoUrl;
            
            // 下載視頻到本地用於 Discord 發送
            const videoResponse = await fetch(generatedVideoUrl);
            const videoBuffer = await videoResponse.buffer();
            const tempVideoPath = `./recordings/${crypto.randomUUID()}.mp4`;
            fs.writeFileSync(tempVideoPath, videoBuffer);
            videoUrl = tempVideoPath;
          }
          
          messages.push({
            tool_call_id: call.id,
            role: "tool",
            name: functionName,
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
            name: functionName,
            content: JSON.stringify({ 
              generateResult: i18n.getString("commands.agent.zhipuVideoTimeout", language),
              taskId: videoResult.taskId,
              taskStatus: "TIMEOUT",
              model: videoResult.model,
              prompt: parsed.prompt
            })
          });
        }
      } else if (functionName === "queryVideoResultZhipu") {
        // Zhipu Video Query
        logger.info(`查询Zhipu AI 视频任务: ${parsed.taskId}`);
        const queryResult = await toolFunctions.queryVideoResultZhipu(parsed.taskId);
        
        messages.push({
          tool_call_id: call.id,
          role: "tool",
          name: functionName,
          content: JSON.stringify(queryResult)
        });
      }
    } catch (error) {
      logger.error(`${functionName} 错误: ${error.message}`);
      messages.push({
        tool_call_id: call.id,
        role: "tool",
        name: functionName,
        content: JSON.stringify({ 
          error: `${functionName} failed: ${error.message}`
        })
      });
    }

    // Fallback for unhandled tool calls
    if (!messages.some(m => m.tool_call_id === call.id)) {
      messages.push({
        tool_call_id: call.id,
        role: "tool",
        name: functionName || "unknown",
        content: JSON.stringify({ error: `No handler implemented for tool call ${functionName}` })
      });
    }
  }

  return { messages, searchResults, dataURI, videoUrl, remoteVideoUrl, actuallySearched, toolUsed };
}

/**
 * 处理LLM响应，包括工具调用循环
 * @param {Object} initialResponse 初始响应
 * @param {Array} messages 消息历史
 * @param {string} modelName 模型名称
 * @param {Array} tools 工具定义
 * @param {Object} client LLM客户端
 * @param {string} language 语言
 * @param {string} userId 用户ID
 * @param {Object} usageLimits 使用限制
 * @returns {Promise<Object>} 最终响应和副作用
 */
async function processLLMResponseWithTools(initialResponse, messages, modelName, tools, client, language, userId, usageLimits) {
  let response = initialResponse;
  let finalSearchResults = [];
  let finalDataURI = null;
  let finalVideoUrl = null;
  let finalRemoteVideoUrl = null;
  let finalActuallySearched = false;
  let finalToolUsed = null;
  
  // Max depth for tool calls to prevent infinite loops
  const MAX_DEPTH = 5;
  let depth = 0;

  while (
    depth < MAX_DEPTH &&
    response.body.choices &&
    response.body.choices[0].finish_reason === "tool_calls"
  ) {
    depth++;
    messages.push(response.body.choices[0].message);
    const calls = response.body.choices[0].message.tool_calls;
    
    if (!calls || calls.length === 0) break;
    
    const toolResult = await handleToolCalls(calls, language);
    
    if (toolResult.messages.length > 0) {
      messages.push(...toolResult.messages);
    }
    
    if (toolResult.searchResults) {
      finalSearchResults = finalSearchResults.concat(toolResult.searchResults);
    }
    
    if (toolResult.dataURI) finalDataURI = toolResult.dataURI;
    if (toolResult.videoUrl) finalVideoUrl = toolResult.videoUrl;
    if (toolResult.remoteVideoUrl) finalRemoteVideoUrl = toolResult.remoteVideoUrl;
    if (toolResult.actuallySearched) finalActuallySearched = true;
    if (toolResult.toolUsed) finalToolUsed = toolResult.toolUsed;
    
    // Update usage before next call
    if (userId && usageLimits) {
        updateUserUsage(userId, modelName, usageLimits);
    }
    
    // Send next request
    response = await sendLLMRequest(messages, modelName, tools, client);
    
    if (response.status !== "200") {
      throw response.body.error || new Error("LLM request failed during tool execution");
    }
  }
  
  return {
    response,
    searchResults: finalSearchResults.length > 0 ? finalSearchResults : null,
    dataURI: finalDataURI,
    videoUrl: finalVideoUrl,
    remoteVideoUrl: finalRemoteVideoUrl,
    actuallySearched: finalActuallySearched,
    toolUsed: finalToolUsed
  };
}

/**
 * 处理用户的完整请求流程
 * @param {Object} params 请求参数
 * @returns {Promise<Object>} 处理结果
 */
async function processUserRequest({
  userId,
  prompt,
  image,
  audio,
  modelName,
  historyMessages = [],
  enableSearch = false,
  enableSystemPrompt = true,
  language = 'en'
}) {
  // 1. Check Usage
  const usageLimits = getModelUsageLimits();
  const usageInfo = updateUserUsage(userId, modelName, usageLimits);
  
  // Update modelName with the one selected/defaulted by updateUserUsage
  modelName = usageInfo.selectedModel;
  
  if (usageInfo.isExceeded) {
    return {
      success: false,
      isUsageExceeded: true,
      usageInfo,
      modelName
    };
  }

  // 2. Create Client
  const client = createLLMClient(modelName);

  // 3. Prepare Messages
  // Clone history to avoid modifying the original array passed by reference
  let messages = [...historyMessages];
  
  // Format new user message
  const userMessage = await formatUserMessage(prompt, image, audio, modelName);
  messages = [...messages, ...userMessage];

  // Add system prompt if enabled
  if (enableSystemPrompt) {
      const systemPrompt = getSystemPrompt(modelName, language);
      messages.unshift(systemPrompt);
  }

  // 4. Get Tools
  const tools = getToolDefinitions(enableSearch);

  // 5. Send Initial Request
  let response = await sendLLMRequest(messages, modelName, tools, client);
  
  if (response.status !== "200") {
      throw response.body.error || new Error(`LLM request failed with status ${response.status}`);
  }

  // 6. Process Tools Loop
  const processed = await processLLMResponseWithTools(
      response,
      messages,
      modelName,
      tools,
      client,
      language,
      userId,
      usageLimits
  );

  // 7. Return Result
  const outputText = processed.response.body.choices[0].message.content;
  
  return {
      success: true,
      isUsageExceeded: false,
      usageInfo,
      outputText,
      searchResults: processed.searchResults,
      dataURI: processed.dataURI,
      videoUrl: processed.videoUrl,
      remoteVideoUrl: processed.remoteVideoUrl,
      actuallySearched: processed.actuallySearched,
      toolUsed: processed.toolUsed,
      tokenUsage: processed.response.body.usage,
      userMessageObj: userMessage
  };
}

module.exports = {
  createLLMClient,
  updateUserUsage,
  getSystemPrompt,
  getToolDefinitions,
  formatUserMessage,
  sendLLMRequest,
  getModelUsageLimits,
  getAllAvailableModels,
  getProviderType,
  handleToolCalls,
  processLLMResponseWithTools,
  processUserRequest
};