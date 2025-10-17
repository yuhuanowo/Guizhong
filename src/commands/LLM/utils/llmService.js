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
const zhipuProvider = require("./providers/zhipuProvider");

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
        "DeepSeek-R1", "DeepSeek-V3-0324", "DeepSeek-R1-0528",
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
  
  // Zhipu AI 提供的模型 - 基於官方文檔
  const zhipuModels = [
    // 文本模型
      "glm-4.6", "glm-4.5-air", "glm-4.5-flash", "glm-4-flash-250414", "glm-z1-flash",
    // 視覺模型
        "glm-4.5v", "glm-4.1v-thinking-flash", "glm-4v-flash",

  ];
  
  // 根据模型名称判断提供商
  if (githubModels.includes(modelName)) return "github";
  if (geminiModels.includes(modelName)) return "gemini";  
  if (ollamaModels.includes(modelName)) return "ollama";
  if (groqModels.includes(modelName)) return "groq";
  if (openRouterModels.includes(modelName)) return "openrouter";
  if (yunmoModels.includes(modelName)) return "yunmo";
  if (zhipuModels.includes(modelName)) return "zhipu";
  
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
function getToolDefinitions(enableSearch = false) {
  const imageTool = {
    type: "function",
    function: {
      name: "generateImage",
      description: "Generate an image using Cloudflare AI and return Base64 dataURI. Use this when user requests to create, generate, or draw an image.",
      parameters: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "Detailed description of the image to generate, in English"
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
      description: "Search the web using DuckDuckGo search engine. Returns relevant search results with titles, URLs, and content snippets. Use this for general web searches when Tavily is not available.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query keywords",
          },
          numResults: {
            type: "integer",
            description: "Number of search results to return",
            default: 10,
          },
        },
        required: ["query"],
      },
    },
  };

  // Tavily Search - AI-optimized search engine
  const tavilySearchTool = {
    type: "function",
    function: {
      name: "tavilySearch",
      description: "Execute intelligent web search using Tavily AI search engine, optimized for AI agents. Automatically filters and extracts the most relevant content with cleaned content snippets. Best for high-quality, structured search results. Use this as the primary search tool when web information is needed.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query string"
          },
          search_depth: {
            type: "string",
            enum: ["basic", "advanced"],
            description: "Search depth. 'basic': Standard search (1 credit), suitable for general queries; 'advanced': Deep search (2 credits), provides more relevant and detailed content chunks. Use 'advanced' for complex or research-oriented queries.",
            default: "basic"
          },
          max_results: {
            type: "integer",
            description: "Maximum number of results to return (0-20)",
            minimum: 0,
            maximum: 20,
            default: 5
          },
          include_answer: {
            type: "boolean",
            description: "Whether to include LLM-generated answer. Set to true when user needs a direct answer to their question (will use 'basic' mode for quick answer). Set to false if only search results are needed.",
            default: false
          },
          include_images: {
            type: "boolean",
            description: "Whether to include related images in results",
            default: false
          },
          topic: {
            type: "string",
            enum: ["general", "news", "finance"],
            description: "Search category. 'general': General search, 'news': News (good for current events), 'finance': Financial information",
            default: "general"
          },
          time_range: {
            type: "string",
            enum: ["day", "week", "month", "year"],
            description: "Time range filter based on publish date. Use this to get recent information."
          }
        },
        required: ["query"]
      }
    }
  };

  // Tavily Extract - Extract content from specific URLs
  const tavilyExtractTool = {
    type: "function",
    function: {
      name: "tavilyExtract",
      description: "Extract cleaned web page content from one or multiple specified URLs. Automatically processes and cleans HTML, returns structured content. Best for extracting complete content from specific web pages. Use this when you have specific URLs to extract content from.",
      parameters: {
        type: "object",
        properties: {
          urls: {
            type: "array",
            items: {
              type: "string"
            },
            description: "List of URLs to extract content from (can also be a single URL string)"
          },
          extract_depth: {
            type: "string",
            enum: ["basic", "advanced"],
            description: "Extraction depth. 'basic': Basic extraction (1 credit/5 URLs), 'advanced': Advanced extraction (2 credits/5 URLs), includes tables and embedded content",
            default: "basic"
          },
          format: {
            type: "string",
            enum: ["markdown", "text"],
            description: "Content format. 'markdown': Markdown format, 'text': Plain text",
            default: "markdown"
          },
          include_images: {
            type: "boolean",
            description: "Whether to include images",
            default: false
          }
        },
        required: ["urls"]
      }
    }
  };

  // Tavily Crawl - Crawl entire websites
  const tavilyCrawlTool = {
    type: "function",
    function: {
      name: "tavilyCrawl",
      description: "Crawl entire websites and extract content, supports deep traversal and intelligent path selection. Best for documentation sites, knowledge bases, blogs where you need to extract content from many pages. Supports regex pattern filtering. Use this when you need to systematically extract content from a whole website or section.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "Root URL to crawl from"
          },
          instructions: {
            type: "string",
            description: "Natural language instructions to guide what content the crawler should focus on (using this option doubles the cost). Example: 'Find all API reference pages' or 'Extract all tutorial articles'"
          },
          max_depth: {
            type: "integer",
            description: "Maximum crawl depth, defines how far from root URL to explore",
            minimum: 1,
            default: 1
          },
          max_breadth: {
            type: "integer",
            description: "Maximum number of links to follow per page",
            minimum: 1,
            default: 20
          },
          limit: {
            type: "integer",
            description: "Total maximum number of pages to process",
            minimum: 1,
            default: 50
          },
          select_paths: {
            type: "array",
            items: {
              type: "string"
            },
            description: "Only select URLs matching these regex path patterns (e.g., ['/docs/.*', '/api/.*'])"
          },
          exclude_paths: {
            type: "array",
            items: {
              type: "string"
            },
            description: "Exclude URLs matching these regex path patterns (e.g., ['/private/.*', '/admin/.*'])"
          },
          extract_depth: {
            type: "string",
            enum: ["basic", "advanced"],
            description: "Content extraction depth",
            default: "basic"
          },
          format: {
            type: "string",
            enum: ["markdown", "text"],
            description: "Content format",
            default: "markdown"
          }
        },
        required: ["url"]
      }
    }
  };

  // Tavily Map - Generate website sitemap
  const tavilyMapTool = {
    type: "function",
    function: {
      name: "tavilyMap",
      description: "Quickly generate website sitemap, returns only discovered URL list without extracting content. Best for quickly understanding site structure, collecting URLs, or planning crawl strategy before using tavilyCrawl. Fast and low cost. Use this to explore site structure before crawling.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "Root URL to map"
          },
          instructions: {
            type: "string",
            description: "Natural language instructions to guide mapping focus (using this option doubles the cost). Example: 'Find all blog post pages'"
          },
          max_depth: {
            type: "integer",
            description: "Maximum mapping depth",
            minimum: 1,
            default: 1
          },
          max_breadth: {
            type: "integer",
            description: "Maximum number of links to follow per page",
            minimum: 1,
            default: 20
          },
          limit: {
            type: "integer",
            description: "Total maximum number of pages to process",
            minimum: 1,
            default: 50
          },
          select_paths: {
            type: "array",
            items: {
              type: "string"
            },
            description: "Only select URLs matching these regex path patterns"
          },
          exclude_paths: {
            type: "array",
            items: {
              type: "string"
            },
            description: "Exclude URLs matching these regex path patterns"
          }
        },
        required: ["url"]
      }
    }
  };

  // Zhipu AI 圖像生成工具
  const zhipuImageTool = {
    type: "function",
    function: {
      name: "generateImageZhipu",
      description: "Generate high-quality images using Zhipu AI's CogView-3-Flash model. Supports text-to-image generation with various sizes. Use this when user requests to create, generate, or draw an image with Zhipu AI, or when high-quality Chinese prompt understanding is needed.",
      parameters: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "Detailed description of the image to generate. Can be in Chinese or English. The model excels at understanding Chinese prompts."
          },
          size: {
            type: "string",
            description: "Image size. Recommended: '1024x1024' (default), '768x1344', '864x1152', '1344x768', '1152x864', '1440x720', '720x1440'. Custom sizes must be 512-2048px, divisible by 16, max 2^21 pixels.",
            default: "1024x1024"
          }
        },
        required: ["prompt"]
      }
    }
  };

  // Zhipu AI 視頻生成工具
  const zhipuVideoTool = {
    type: "function",
    function: {
      name: "generateVideoZhipu",
      description: "Generate videos using Zhipu AI's CogVideoX-Flash model. Supports text-to-video and image-to-video generation. This is an asynchronous operation that returns a task ID. Use queryVideoResultZhipu to check the generation status and get the video file. Suitable for creating short video clips with AI-generated content or animations.",
      parameters: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "Detailed description of the video to generate. Can be in Chinese or English. Maximum 512 characters. Required unless imageUrl is provided."
          },
          quality: {
            type: "string",
            enum: ["speed", "quality"],
            description: "Generation mode. 'speed': Faster generation (default), 'quality': Higher quality output, takes longer",
            default: "speed"
          },
          size: {
            type: "string",
            enum: ["1280x720", "720x1280", "1024x1024", "1920x1080", "1080x1920", "2048x1080", "3840x2160"],
            description: "Video resolution. Default is based on input image ratio if imageUrl is provided, otherwise uses 1080p for shortest side.",
            default: "1920x1080"
          },
          fps: {
            type: "integer",
            enum: [30, 60],
            description: "Frame rate (FPS). Options: 30 or 60. Default: 30",
            default: 30
          },
          duration: {
            type: "integer",
            enum: [5, 10],
            description: "Video duration in seconds. Options: 5 or 10. Default: 5",
            default: 5
          },
          withAudio: {
            type: "boolean",
            description: "Whether to generate AI audio effects. Default: false",
            default: false
          },
          imageUrl: {
            type: "string",
            description: "Optional: URL or Base64 encoded image to generate video from. Supports PNG, JPEG, JPG formats, max 5MB. Can be used with or without prompt for image-to-video generation."
          }
        },
        required: []
      }
    }
  };

  // 查詢Zhipu視頻生成結果工具
  const queryZhipuVideoTool = {
    type: "function",
    function: {
      name: "queryVideoResultZhipu",
      description: "Query the status and result of a Zhipu AI video generation task. Use this after calling generateVideoZhipu to check if the video is ready and get the download file. The task may be PROCESSING (in progress), SUCCESS (completed), or FAIL (failed).",
      parameters: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "The task ID returned by generateVideoZhipu"
          }
        },
        required: ["taskId"]
      }
    }
  };

  const tools = [imageTool];
  
  // 添加Zhipu AI 工具
  tools.push(zhipuImageTool);
  tools.push(zhipuVideoTool);
  tools.push(queryZhipuVideoTool);
  
  if (enableSearch) {
    tools.push(searchTool);
    tools.push(tavilySearchTool);
    tools.push(tavilyExtractTool);
    tools.push(tavilyCrawlTool);
    tools.push(tavilyMapTool);
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
    "gpt-5-chat": 6,
    "gpt-5-mini": 6,
    "gpt-5-nano": 6,
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
    "DeepSeek-R1-0528": 4,
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
    
    // Zhipu AI Models
    // 文本模型 - 根據官方價格頁面設定
    "glm-4.6": High, 
    "glm-4.5-air": Low,
    "glm-4.5-flash": InfinityLimit,  
    "glm-4-flash-250414": InfinityLimit,
    "glm-z1-flash": InfinityLimit,
    
    // 視覺模型
    "glm-4.5v": Low,
    "glm-4.1v-thinking-flash": InfinityLimit,
    "glm-4v-flash": InfinityLimit,


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
    { name: "[DeepSeek] DeepSeek R1 0528", value: "DeepSeek-R1-0528" },
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
    
    // Zhipu AI - 文本模型
    { name: "[Zhipu] GLM-4.6", value: "glm-4.6" },
    { name: "[Zhipu] GLM-4.5-Air", value: "glm-4.5-air" },
    { name: "[Zhipu] GLM-4.5-Flash (Free)", value: "glm-4.5-flash" },
    { name: "[Zhipu] GLM-4-Flash-250414 (Free)", value: "glm-4-flash-250414" },
    { name: "[Zhipu] GLM-Z1-Flash (Free)", value: "glm-z1-flash" },
    
    // Zhipu AI - 視覺模型
    { name: "[Zhipu] GLM-4.5V", value: "glm-4.5v" },
    { name: "[Zhipu] GLM-4.1V-Thinking-Flash (Free)", value: "glm-4.1v-thinking-flash" },
    { name: "[Zhipu] GLM-4V-Flash (Free)", value: "glm-4v-flash" },

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