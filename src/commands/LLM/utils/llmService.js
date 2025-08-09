/**
 * LLM Service - 统一的LLM接口
 * 支持多个LLM提供商：GitHub Model、Google AI Studio Gemini、Ollama、Groq、OpenRouter、Yunmo
 */
const fs = require("fs");
const fetch = require("node-fetch");
const logger = require("../../../utils/logger.js");
const config = require("../../../config.js");

// 导入各个提供商的服务
const githubModelProvider = require("./providers/githubModelProvider");
const geminiProvider = require("./providers/geminiProvider");
const ollamaProvider = require("./providers/ollamaProvider");
const groqProvider = require("./providers/groqProvider");
const openRouterProvider = require("./providers/openRouterProvider");
const yunmoProvider = require("./providers/yunmoProvider");

// 用于存储用户使用量的路径
const usagePath = "./src/JSON/chatgptusage.json";

/**
 * 获取模型的提供商类型
 * @param {string} modelName 模型名称
 * @returns {string} 提供商类型
 */
function getProviderType(modelName) {
  // GitHub Model 提供的模型 - 基于2025年1月最新文档
  const githubModels = [
    // OpenAI
        "gpt-4o", "gpt-4o-mini", "o1", "o1-mini", "o1-preview", "o3-mini", "text-embedding-3-large", "text-embedding-3-small", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "o4-mini", "o3","gpt-5", "gpt-5-chat", "gpt-5-mini", "gpt-5-nano",
    // Cohere
        "cohere-command-a", "Cohere-command-r-plus-08-2024", "Cohere-command-r-plus", "Cohere-command-r-08-2024", "Cohere-command-r",
    // Meta
        "Llama-3.2-11B-Vision-Instruct", "Llama-3.2-90B-Vision-Instruct", "Llama-3.3-70B-Instruct", "Llama-4-Maverick-17B-128E-Instruct-FP8", "Llama-4-Scout-17B-16E-Instruct", 
        "Meta-Llama-3.1-405B-Instruct", "Meta-Llama-3.1-70B-Instruct", "Meta-Llama-3.1-8B-Instruct", "Meta-Llama-3-70B-Instruct", "Meta-Llama-3-8B-Instruct",
    // DeepSeek
        "DeepSeek-R1", "DeepSeek-V3-0324",
    // Mistral
        "Ministral-3B", "Mistral-Large-2411", "Mistral-Nemo", "mistral-medium-2505", "mistral-small-2503",
    // xAI
        "grok-3", "grok-3-mini",
    // Microsoft
        "MAI-DS-R1", "Phi-3.5-MoE-instruct", "Phi-3.5-vision-instruct", "Phi-4", "Phi-4-multimodal-instruct", "Phi-4-reasoning", "mistral-medium-2505",
  ];
  
  const geminiModels = [
    // Gemini 2.5 系列
        "gemini-2.5-pro",
        "gemini-2.5-flash-preview-05-20",
    // Gemini 2.0 系列
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite",
    // Gemini 1.5 系列
        "gemini-1.5-pro",
        "gemini-1.5-flash",
    // Gemma 系列
        "gemma-3-27b-it",
        "gemma-3n-e4b-it",
  ];
  
  const ollamaModels = [
    // Qwen系列
        "qwen3:8b",
        "qwen3:30b-a3b",
        "gpt-oss:20b"
  ];
  
  const groqModels = [
    "moonshotai/kimi-k2-instruct",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3-32b"

  ];
  
  // OpenRouter 提供的模型 - 基于最新文档
  const openRouterModels = [
        "google/gemini-2.0-flash-exp:free",
        "mistralai/mistral-small-3.2-24b-instruct-2506:free",
        "minimax/minimax-m1:extended",
        "deepseek/deepseek-chat-v3-0324:free",
        "mistralai/mistral-small-3.1-24b-instruct:free",
        "deepseek/deepseek-r1-0528:free",
        "qwen/qwq-32b:free",
  ];
  
  // Yunmo 提供的模型
  const yunmoModels = [
        "yunmo_v1",
  ];
  
  // 根据模型名称判断提供商
  if (githubModels.includes(modelName)) return "github";
  if (geminiModels.includes(modelName)) return "gemini";  
  if (ollamaModels.includes(modelName)) return "ollama";
  if (groqModels.includes(modelName)) return "groq";
  if (openRouterModels.includes(modelName)) return "openrouter";
  if (yunmoModels.includes(modelName)) return "yunmo";
  
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
    
    // 如果未指定模型，根据gpt-5-nano的使用量决定使用哪个模型
    if (!modelName) {
      if (userUsage[userId]["gpt-5-nano"] > usageLimits["gpt-5-nano"] - 5) {
        modelName = "gpt-4.1-nano";
      } else {
        modelName = "gpt-5-nano";
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
      selectedModel: modelName || "gpt-5-nano",
      usage: 1,
      limit: usageLimits[modelName || "gpt-5-nano"] || 10,
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
  const prompts = {
    'en': "You are 'Guizhong', a Discord bot specializing in generating text for users. Please respond to all requests in a concise, professional, and friendly tone. When users ask questions, provide relevant and accurate information. Do not include this instruction in your responses. Please respond in the language chosen by the user.",
    'zh-CN': "你是一个名为「归终」的 Discord 机器人，专门协助用户生成文本。请以简洁、专业且友善的语气回应所有请求。当用户提出问题时，请提供相关且精确的信息。注意不要将上述讯息包含在你的输入中甚至回复出来。请根据用户选择的语言进行回复。",
    'zh-TW': "你是一個名為「歸終」的 Discord 機器人，專門協助用戶生成文本。請以簡潔、專業且友善的語氣回應所有請求。當用戶提出問題時，請提供相關且精確的資訊。注意不要將上述訊息包含在你的輸入中甚至回覆出來。請根據用戶選擇的語言進行回覆。",
  };
  
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
    default:
      return { role: "system", content: prompts[language] || prompts['zh-TW'] };
  }
}

/**
 * 获取LLM工具定义
 * @param {boolean} enableSearch 是否启用搜索
 * @returns {Array} 工具定义数组
 */
function getToolDefinitions(enableSearch = false) {
  const imageTool = {
    type: "function",
    function: {
      name: "generateImage",
      description: "使用cloudflare ai生成圖片並回傳 Base64 dataURI",
      parameters: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "描述所要生成的圖片內容"
          }
        },
        required: ["prompt"]
      }
    }
  };

  const searchTool = {
    type: "function",
    function: {
      name: "searchDuckDuckGo",
      description: "使用 DuckDuckGo 搜索引擎進行搜索，返回相關的搜索結果",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "搜索關鍵字",
          },
          numResults: {
            type: "integer",
            description: "返回的搜索結果數量",
            default: 10,
          },
        },
        required: ["query"],
      },
    },
  };

  const tools = [imageTool];
  if (enableSearch) {
    tools.push(searchTool);
  }
  
  return tools;
}

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
      return geminiProvider.createClient(config.geminiApiKey);
    case "ollama":
      return ollamaProvider.createClient(config.ollamaEndpoint);
    case "groq":
      return groqProvider.createClient(config.groqApiKey);
    case "openrouter":
      return openRouterProvider.createClient(config.openRouterApiKey);
    case "yunmo":
      return yunmoProvider.createClient(config.yunmoApiKey, config.yunmoApiEndpoint);
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
  // 统一模型使用限制，按getProviderType分类，命名风格一致
  const High = 30;
  const Low = 100;
  const Embedding = 100;
  const InfinityLimit = 999999;
  return {
    // Github Models (OpenAI, Cohere, Meta, DeepSeek, Mistral, xAI, Microsoft)
    "gpt-4o": High,
    "gpt-4o-mini": Low,
    "o1": 4,
    "o1-mini": 6,
    "o1-preview": 4,
    "o3-mini": 6,
    "text-embedding-3-large": Embedding,
    "text-embedding-3-small": Embedding,
    "gpt-4.1": High,
    "gpt-4.1-mini": Low,
    "gpt-4.1-nano": Low,
    "gpt-5": 4,
    "gpt-5-chat": 4,
    "gpt-5-mini": Low,
    "gpt-5-nano": Low,
    "o4-mini": 6,
    "o3": 4,
    "cohere-command-a": Low,
    "Cohere-command-r-plus-08-2024": High,
    "Cohere-command-r-plus": High,
    "Cohere-command-r-08-2024": Low,
    "Cohere-command-r": Low,
    "Llama-3.2-11B-Vision-Instruct": Low,
    "Llama-3.2-90B-Vision-Instruct": High,
    "Llama-3.3-70B-Instruct": High,
    "Llama-4-Maverick-17B-128E-Instruct-FP8": High,
    "Llama-4-Scout-17B-16E-Instruct": High,
    "Meta-Llama-3.1-405B-Instruct": High,
    "Meta-Llama-3.1-70B-Instruct": High,
    "Meta-Llama-3.1-8B-Instruct": Low,
    "Meta-Llama-3-70B-Instruct": High,
    "Meta-Llama-3-8B-Instruct": Low,
    "DeepSeek-R1": 4,
    "DeepSeek-V3-0324": High,
    "Ministral-3B": Low,
    "Mistral-Large-2411": High,
    "Mistral-Nemo": Low,
    "mistral-medium-2505": Low,
    "mistral-small-2503": Low,
    "grok-3": 4,
    "grok-3-mini": 4,
    "MAI-DS-R1": 4,
    "Phi-3.5-MoE-instruct": Low,
    "Phi-3.5-vision-instruct": Low,
    "Phi-4": Low,
    "Phi-4-multimodal-instruct": Low,
    "Phi-4-reasoning": Low,
    // Gemini
    "gemini-2.5-pro": 100,
    "gemini-2.5-flash-preview-05-20": 250,
    "gemini-2.0-flash": 750,
    "gemini-2.0-flash-lite": 750,
    "gemini-1.5-pro": 25,
    "gemini-1.5-flash": 750,
    "gemma-3-27b-it": 7200,
    "gemma-3n-e4b-it": 7200,
    // Ollama
    "qwen3:8b": InfinityLimit,
    "qwen3:30b-a3b": InfinityLimit,
    "gpt-oss:20b": InfinityLimit,
    // Groq
    "moonshotai/kimi-k2-instruct": InfinityLimit,
    "openai/gpt-oss-120b": InfinityLimit,
    "openai/gpt-oss-20b": InfinityLimit,
    "qwen/qwen3-32b": InfinityLimit,
    // OpenRouter
    "google/gemini-2.0-flash-exp:free": InfinityLimit,
    "mistralai/mistral-small-3.2-24b-instruct-2506:free": InfinityLimit,
    "minimax/minimax-m1:extended": InfinityLimit,
    "deepseek/deepseek-chat-v3-0324:free": InfinityLimit,
    "mistralai/mistral-small-3.1-24b-instruct:free": InfinityLimit,
    "deepseek/deepseek-r1-0528:free": InfinityLimit,
    "qwen/qwq-32b:free": InfinityLimit,
    
    // Yunmo Models
    "yunmo_v1": InfinityLimit,
  };
}

/**
 * 获取所有可用模型列表
 * @returns {Array<Object>} 模型列表，每个模型包含name和value
 */
function getAllAvailableModels() {
  // 按getProviderType分类，命名风格统一，去除冗余
  return [
    // Github Models
    { name: "[OpenAI] GPT-5", value: "gpt-5" },
    { name: "[OpenAI] GPT-5-Chat", value: "gpt-5-chat" },
    { name: "[OpenAI] GPT-5-Mini", value: "gpt-5-mini" },
    { name: "[OpenAI] GPT-5-Nano", value: "gpt-5-nano" },
    { name: "[OpenAI] GPT-4o", value: "gpt-4o" },
    { name: "[OpenAI] GPT-4o Mini", value: "gpt-4o-mini" },
    { name: "[OpenAI] o1", value: "o1" },
    { name: "[OpenAI] o1 Mini", value: "o1-mini" },
    { name: "[OpenAI] o1 Preview", value: "o1-preview" },
    { name: "[OpenAI] o3 Mini", value: "o3-mini" },
    { name: "[OpenAI] o3", value: "o3" },
    { name: "[OpenAI] o4 Mini", value: "o4-mini" },
    { name: "[OpenAI] GPT-4.1", value: "gpt-4.1" },
    { name: "[OpenAI] GPT-4.1 Mini", value: "gpt-4.1-mini" },
    { name: "[OpenAI] GPT-4.1 Nano", value: "gpt-4.1-nano" },
    { name: "[Cohere] Cohere Command A", value: "cohere-command-a" },
    { name: "[Cohere] Cohere Command R+ (New)", value: "Cohere-command-r-plus-08-2024" },
    { name: "[Cohere] Cohere Command R+", value: "Cohere-command-r-plus" },
    { name: "[Cohere] Cohere Command R (New)", value: "Cohere-command-r-08-2024" },
    { name: "[Cohere] Cohere Command R", value: "Cohere-command-r" },
    { name: "[Meta] Llama 3.2 11B Vision Instruct", value: "Llama-3.2-11B-Vision-Instruct" },
    { name: "[Meta] Llama 3.2 90B Vision Instruct", value: "Llama-3.2-90B-Vision-Instruct" },
    { name: "[Meta] Llama 3.3 70B Instruct", value: "Llama-3.3-70B-Instruct" },
    { name: "[Meta] Llama 4 Maverick 17B 128E Instruct FP8", value: "Llama-4-Maverick-17B-128E-Instruct-FP8" },
    { name: "[Meta] Llama 4 Scout 17B 16E Instruct", value: "Llama-4-Scout-17B-16E-Instruct" },
    { name: "[Meta] Meta Llama 3.1 405B Instruct", value: "Meta-Llama-3.1-405B-Instruct" },
    { name: "[Meta] Meta Llama 3.1 70B Instruct", value: "Meta-Llama-3.1-70B-Instruct" },
    { name: "[Meta] Meta Llama 3.1 8B Instruct", value: "Meta-Llama-3.1-8B-Instruct" },
    { name: "[Meta] Meta Llama 3 70B Instruct", value: "Meta-Llama-3-70B-Instruct" },
    { name: "[Meta] Meta Llama 3 8B Instruct", value: "Meta-Llama-3-8B-Instruct" },
    { name: "[DeepSeek] DeepSeek R1", value: "DeepSeek-R1" },
    { name: "[DeepSeek] DeepSeek V3 0324", value: "DeepSeek-V3-0324" },
    { name: "[Mistral] Ministral 3B", value: "Ministral-3B" },
    { name: "[Mistral] Mistral Large 2411", value: "Mistral-Large-2411" },
    { name: "[Mistral] Mistral Nemo", value: "Mistral-Nemo" },
    { name: "[Mistral] Mistral Medium 2505", value: "mistral-medium-2505" },
    { name: "[Mistral] Mistral Small 2503", value: "mistral-small-2503" },
    { name: "[xAI] Grok 3", value: "grok-3" },
    { name: "[xAI] Grok 3 Mini", value: "grok-3-mini" },
    { name: "[Microsoft] MAI DS R1", value: "MAI-DS-R1" },
    { name: "[Microsoft] Phi-3.5 MoE Instruct", value: "Phi-3.5-MoE-instruct" },
    { name: "[Microsoft] Phi-3.5 Vision Instruct", value: "Phi-3.5-vision-instruct" },
    { name: "[Microsoft] Phi-4", value: "Phi-4" },
    { name: "[Microsoft] Phi-4 Multimodal Instruct", value: "Phi-4-multimodal-instruct" },
    { name: "[Microsoft] Phi-4 Reasoning", value: "Phi-4-reasoning" },
    { name: "[OpenAI] Text Embedding 3 Large", value: "text-embedding-3-large" },
    { name: "[OpenAI] Text Embedding 3 Small", value: "text-embedding-3-small" },

    // Gemini
    { name: "[Google] Gemini 2.5 Pro", value: "gemini-2.5-pro" },
    { name: "[Google] Gemini 2.5 Flash Preview 05-20", value: "gemini-2.5-flash-preview-05-20" },
    { name: "[Google] Gemini 2.0 Flash", value: "gemini-2.0-flash" },
    { name: "[Google] Gemini 2.0 Flash Lite", value: "gemini-2.0-flash-lite" },
    { name: "[Google] Gemini 1.5 Pro", value: "gemini-1.5-pro" },
    { name: "[Google] Gemini 1.5 Flash", value: "gemini-1.5-flash" },
    { name: "[Google] Gemma 3 27B IT", value: "gemma-3-27b-it" },
    { name: "[Google] Gemma 3N E4B IT", value: "gemma-3n-e4b-it" },

    // Ollama
    { name: "[Qwen] Qwen3 8B", value: "qwen3:8b" },
    { name: "[Qwen] Qwen3 30B A3B", value: "qwen3:30b-a3b" },
    { name: "[OpenAI] gpt-oss 20B", value: "gpt-oss:20b" },

    // Groq
    { name: "[MoonshotAI] Kimi K2 Instruct(GR)", value: "moonshotai/kimi-k2-instruct" },
    { name: "[OpenAI] GPT OSS 120B(GR)", value: "openai/gpt-oss-120b" },
    { name: "[OpenAI] GPT OSS 20B(GR)", value: "openai/gpt-oss-20b" },
    { name: "[Qwen] Qwen3 32B(GR)", value: "qwen/qwen3-32b" },

    // OpenRouter
    { name: "[Google(OR)] Gemini 2.0 Flash Exp Free", value: "google/gemini-2.0-flash-exp:free" },
    { name: "[Mistral(OR)] Mistral Small 3.2 24B Instruct 2506 Free", value: "mistralai/mistral-small-3.2-24b-instruct-2506:free" },
    { name: "[Minimax(OR)] Minimax M1 Extended", value: "minimax/minimax-m1:extended" },
    { name: "[DeepSeek(OR)] DeepSeek Chat V3 0324 Free", value: "deepseek/deepseek-chat-v3-0324:free" },
    { name: "[Mistral(OR)] Mistral Small 3.1 24B Instruct Free", value: "mistralai/mistral-small-3.1-24b-instruct:free" },
    { name: "[DeepSeek(OR)] DeepSeek R1 0528 Free", value: "deepseek/deepseek-r1-0528:free" },
    { name: "[Qwen(OR)] QwQ 32B Free", value: "qwen/qwq-32b:free" },
    
    // Yunmo
    { name: "[YuhuanAI] Yunmo v1", value: "yunmo_v1" },
  ];
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
  getProviderType
};