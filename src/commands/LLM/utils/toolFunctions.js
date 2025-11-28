const fetch = require("node-fetch");
const axios = require("axios");
const cheerio = require("cheerio");
const logger = require("../../../utils/logger.js");
const fs = require("fs");
const crypto = require("crypto");
const { AttachmentBuilder } = require("discord.js");
const config = require("../../../config.js");
const zhipuProvider = require("./providers/zhipuProvider.js");

// Tavily API 基礎配置
const TAVILY_BASE_URL = "https://api.tavily.com";
const getTavilyApiKey = () => config.tavilyApiKey || process.env.TAVILY_API_KEY;

/**
 * Tavily Search API - 執行網頁搜尋
 * @param {Object} options 搜尋選項
 * @param {string} options.query - 搜尋查詢 (必填)
 * @param {boolean} [options.auto_parameters=false] - 自動配置參數
 * @param {string} [options.topic='general'] - 搜尋類別: 'general', 'news', 'finance'
 * @param {string} [options.search_depth='basic'] - 搜尋深度: 'basic' (1 credit), 'advanced' (2 credits)
 * @param {number} [options.chunks_per_source=3] - 每個來源的內容片段數 (1-3, 僅在 advanced 模式)
 * @param {number} [options.max_results=5] - 最大結果數 (0-20)
 * @param {string} [options.time_range] - 時間範圍: 'day', 'week', 'month', 'year'
 * @param {number} [options.days=7] - 天數 (僅適用於 news)
 * @param {string} [options.start_date] - 開始日期 (YYYY-MM-DD)
 * @param {string} [options.end_date] - 結束日期 (YYYY-MM-DD)
 * @param {boolean|string} [options.include_answer=false] - 包含 LLM 生成的答案: false, true/'basic', 'advanced'
 * @param {boolean|string} [options.include_raw_content=false] - 包含原始內容: false, true/'markdown', 'text'
 * @param {boolean} [options.include_images=false] - 包含圖片搜尋結果
 * @param {boolean} [options.include_image_descriptions=false] - 包含圖片描述
 * @param {boolean} [options.include_favicon=false] - 包含網站圖標
 * @param {string[]} [options.include_domains] - 僅包含這些域名 (最多 300)
 * @param {string[]} [options.exclude_domains] - 排除這些域名 (最多 150)
 * @param {string} [options.country] - 優先顯示特定國家的結果
 * @returns {Promise<Object>} 搜尋結果
 */
async function tavilySearch(options) {
  try {
    const apiKey = getTavilyApiKey();
    if (!apiKey) {
      throw new Error("Tavily API Key 未配置");
    }

    logger.info(`Tavily Search: "${options.query}"`);

    // 標準化 include_answer 參數
    // API 接受: false (布爾), "basic" (字符串), "advanced" (字符串)
    if (options.include_answer !== undefined) {
      if (options.include_answer === true || options.include_answer === "true") {
        options.include_answer = "basic"; // 將 true 轉換為 "basic"
      } else if (options.include_answer === false || options.include_answer === "false") {
        options.include_answer = false; // 確保是布爾值 false
      }
      // "basic" 和 "advanced" 保持不變
    }

    const response = await axios.post(
      `${TAVILY_BASE_URL}/search`,
      options,
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        timeout: 30000
      }
    );

    logger.success(`Tavily Search 完成，找到 ${response.data.results?.length || 0} 個結果`);
    return response.data;
  } catch (error) {
    logger.error(`Tavily Search 錯誤: ${error.message}`);
    if (error.response) {
      logger.error(`API 回應錯誤: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

/**
 * Tavily Extract API - 從指定 URL 提取內容
 * @param {Object} options 提取選項
 * @param {string|string[]} options.urls - 要提取的 URL (必填)
 * @param {boolean} [options.include_images=false] - 包含圖片
 * @param {boolean} [options.include_favicon=false] - 包含網站圖標
 * @param {string} [options.extract_depth='basic'] - 提取深度: 'basic' (1 credit/5 URLs), 'advanced' (2 credits/5 URLs)
 * @param {string} [options.format='markdown'] - 格式: 'markdown', 'text'
 * @param {number} [options.timeout] - 超時時間(秒, 1-60)
 * @returns {Promise<Object>} 提取結果
 */
async function tavilyExtract(options) {
  try {
    const apiKey = getTavilyApiKey();
    if (!apiKey) {
      throw new Error("Tavily API Key 未配置");
    }

    const urls = Array.isArray(options.urls) ? options.urls : [options.urls];
    logger.info(`Tavily Extract: 提取 ${urls.length} 個 URL`);

    const response = await axios.post(
      `${TAVILY_BASE_URL}/extract`,
      { ...options, urls },
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        timeout: (options.timeout || 30) * 1000 + 5000 // 加5秒緩衝
      }
    );

    logger.success(
      `Tavily Extract 完成，成功: ${response.data.results?.length || 0}, ` +
      `失敗: ${response.data.failed_results?.length || 0}`
    );
    return response.data;
  } catch (error) {
    logger.error(`Tavily Extract 錯誤: ${error.message}`);
    if (error.response) {
      logger.error(`API 回應錯誤: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

/**
 * Tavily Crawl API - 爬取網站並提取內容
 * @param {Object} options 爬取選項
 * @param {string} options.url - 根 URL (必填)
 * @param {string} [options.instructions] - 自然語言指令 (使用時成本翻倍)
 * @param {number} [options.max_depth=1] - 最大深度
 * @param {number} [options.max_breadth=20] - 每層最大鏈接數
 * @param {number} [options.limit=50] - 總鏈接處理數
 * @param {string[]} [options.select_paths] - 選擇特定路徑的正則表達式
 * @param {string[]} [options.select_domains] - 選擇特定域名的正則表達式
 * @param {string[]} [options.exclude_paths] - 排除特定路徑的正則表達式
 * @param {string[]} [options.exclude_domains] - 排除特定域名的正則表達式
 * @param {boolean} [options.allow_external=true] - 是否包含外部鏈接
 * @param {boolean} [options.include_images=false] - 包含圖片
 * @param {string} [options.extract_depth='basic'] - 提取深度: 'basic', 'advanced'
 * @param {string} [options.format='markdown'] - 格式: 'markdown', 'text'
 * @param {boolean} [options.include_favicon=false] - 包含網站圖標
 * @returns {Promise<Object>} 爬取結果
 */
async function tavilyCrawl(options) {
  try {
    const apiKey = getTavilyApiKey();
    if (!apiKey) {
      throw new Error("Tavily API Key 未配置");
    }

    logger.info(`Tavily Crawl: ${options.url}`);
    if (options.instructions) {
      logger.info(`Tavily Crawl 指令: ${options.instructions}`);
    }

    const response = await axios.post(
      `${TAVILY_BASE_URL}/crawl`,
      options,
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        timeout: 120000 // 2分鐘超時
      }
    );

    logger.success(`Tavily Crawl 完成，爬取 ${response.data.results?.length || 0} 個頁面`);
    return response.data;
  } catch (error) {
    logger.error(`Tavily Crawl 錯誤: ${error.message}`);
    if (error.response) {
      logger.error(`API 回應錯誤: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

/**
 * Tavily Map API - 生成網站地圖
 * @param {Object} options 地圖選項
 * @param {string} options.url - 根 URL (必填)
 * @param {string} [options.instructions] - 自然語言指令 (使用時成本翻倍)
 * @param {number} [options.max_depth=1] - 最大深度
 * @param {number} [options.max_breadth=20] - 每層最大鏈接數
 * @param {number} [options.limit=50] - 總鏈接處理數
 * @param {string[]} [options.select_paths] - 選擇特定路徑的正則表達式
 * @param {string[]} [options.select_domains] - 選擇特定域名的正則表達式
 * @param {string[]} [options.exclude_paths] - 排除特定路徑的正則表達式
 * @param {string[]} [options.exclude_domains] - 排除特定域名的正則表達式
 * @param {boolean} [options.allow_external=true] - 是否包含外部鏈接
 * @returns {Promise<Object>} 地圖結果 (URL 列表)
 */
async function tavilyMap(options) {
  try {
    const apiKey = getTavilyApiKey();
    if (!apiKey) {
      throw new Error("Tavily API Key 未配置");
    }

    logger.info(`Tavily Map: ${options.url}`);
    if (options.instructions) {
      logger.info(`Tavily Map 指令: ${options.instructions}`);
    }

    const response = await axios.post(
      `${TAVILY_BASE_URL}/map`,
      options,
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        timeout: 60000 // 1分鐘超時
      }
    );

    logger.success(`Tavily Map 完成，發現 ${response.data.results?.length || 0} 個 URL`);
    return response.data;
  } catch (error) {
    logger.error(`Tavily Map 錯誤: ${error.message}`);
    if (error.response) {
      logger.error(`API 回應錯誤: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

/**
 * 通過Cloudflare API生成图片
 * @param {string} prompt 提示词
 * @returns {Promise<string|null>} 返回dataURI或null
 */
async function generateImageCloudflare(prompt) {
  try {
    const apiKey = config.cloudflareApiKey || process.env.CLOUDFLARE_API_KEY;
    const endpoint = config.cloudflareEndpoint || process.env.CLOUDFLARE_ENDPOINT;
    if (!apiKey) throw new Error("Cloudflare API Key 未配置");
    if (!endpoint) throw new Error("Cloudflare Endpoint 未配置");
    const response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      method: "POST",
      body: JSON.stringify({ "prompt": prompt })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if (!result || !result.result || !result.result.image) {
      throw new Error("Invalid response format");
    }

    const dataURI = `data:image/jpeg;base64,${result.result.image}`;
    return dataURI;
  } catch (error) {
    logger.error("Image generation error:", error);
    return null;
  }
}

/**
 * 使用DuckDuckGo进行简易搜索
 * @param {string} query 搜索关键词
 * @param {number} numResults 结果数量
 * @returns {Promise<Array>} 搜索结果数组
 */
async function searchDuckDuckGoLite(query, numResults) {
  try {
    logger.info(`開始搜尋: "${query}", 預期結果數: ${numResults}`);
    
    const response = await axios.get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 10000 // 10秒超時
    });
    
    const $ = cheerio.load(response.data);
    const results = [];

    const prefix = "//duckduckgo.com/l/?uddg=";

    $("a.result__a").each((index, element) => {
      if (index >= numResults) return false;
      const title = $(element).text().trim();
      let url = $(element).attr("href")?.trim() || "";

      // 移除DuckDuckGo前缀
      if (url.startsWith(prefix)) {
        url = decodeURIComponent(url.slice(prefix.length));
      }

      // 移除URL中的&rut=及其后部分
      const rutIndex = url.indexOf("&rut=");
      if (rutIndex !== -1) {
        url = url.slice(0, rutIndex);
      }

      if (title && url) {
        results.push({ title, url });
      }
    });

    logger.info(`DuckDuckGo 搜尋找到 ${results.length} 個初始結果`);

    // 获取网页内容、解析域名与图标
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      try {
        const siteRes = await axios.get(result.url, {
          timeout: 5000,
          maxRedirects: 3
        });
        const $site = cheerio.load(siteRes.data);
        const domain = new URL(result.url).hostname;
        const icon = `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(domain)}`;
        const description = $site('meta[name="description"]').attr('content') || 
                           $site('meta[property="og:description"]').attr('content') || 
                           $site('meta[name="twitter:description"]').attr('content') || 
                           $site('p').first().text().slice(0, 200) || 
                           '無描述';
        result.icon = icon;
        result.domain = domain;
        result.contentSnippet = description.trim();
        // logger.success(`成功獲取第 ${i + 1} 個結果的詳細信息: ${result.title}`);
      } catch (err) {
        // 若无法连接网站则只返回基本信息
        logger.warn(`無法獲取網站詳細信息 ${result.url}: ${err.message}`);
        const domain = result.url.match(/^https?:\/\/([^\/]+)/)?.[1] || 'unknown';
        result.icon = `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(domain)}`;
        result.domain = domain;
        result.contentSnippet = '無法獲取描述';
      }
    }

    logger.info(`搜尋完成，返回 ${results.length} 個結果`);
    return results;
  } catch (error) {
    logger.error(`DuckDuckGo 搜尋錯誤: ${error.message}`);
    logger.error(`錯誤堆棧: ${error.stack}`);
    return [];
  }
}

/**
 * 处理生成的图片
 * @param {string} dataURI 图片的dataURI
 * @returns {Promise<{path: string, attachment: AttachmentBuilder}>} 处理结果
 */
function processGeneratedImage(dataURI) {
  if (!dataURI || !dataURI.startsWith("data:image/jpeg;base64,")) {
    return { path: null, attachment: null };
  }

  const base64Data = dataURI.replace(/^data:image\/jpeg;base64,/, "");
  const tempFilePath = `./recordings/${crypto.randomUUID()}.jpg`;
  fs.writeFileSync(tempFilePath, base64Data, "base64");
  const attachment = new AttachmentBuilder(tempFilePath);
  
  return {
    path: tempFilePath,
    attachment
  };
}

/**
 * 使用Zhipu AI 生成圖像 (僅使用免費模型 cogview-3-flash)
 * @param {Object} options 生成選項
 * @param {string} options.prompt - 圖像描述提示 (必填)
 * @param {string} [options.size='1024x1024'] - 圖片尺寸
 * @param {boolean} [options.watermark_enabled=true] - 是否添加水印
 * @returns {Promise<Object>} 生成結果 { imageUrl, created }
 */
async function generateImageZhipu(options) {
  try {
    const apiKey = config.zhipuApiKey;
    if (!apiKey) {
      throw new Error("Zhipu AI API Key 未配置");
    }
    
    const client = zhipuProvider.createClient(apiKey);
    // 固定使用免費模型
    const modelName = "cogview-3-flash";
    
    const result = await zhipuProvider.generateImage(
      options.prompt,
      modelName,
      client
    );
    
    return result;
  } catch (error) {
    logger.error(`Zhipu AI 圖像生成錯誤: ${error.message}`);
    throw error;
  }
}

/**
 * 使用Zhipu AI 生成視頻 (僅使用免費模型 cogvideox-flash)
 * 注意：這是異步接口，需要使用 queryVideoResultZhipu 查詢結果
 * @param {Object} options 生成選項
 * @param {string} options.prompt - 視頻描述提示
 * @param {string} [options.quality='speed'] - 質量: 'speed' (快速), 'quality' (高質量)
 * @param {boolean} [options.withAudio=false] - 是否生成 AI 音效
 * @param {string} [options.size='1920x1080'] - 視頻尺寸
 * @param {number} [options.fps=30] - 幀率: 30 或 60
 * @param {number} [options.duration=5] - 持續時長(秒): 5 或 10
 * @param {string} [options.imageUrl] - 基於圖片生成視頻的圖片 URL
 * @param {boolean} [options.watermark_enabled=true] - 是否添加水印
 * @returns {Promise<Object>} 任務信息 { taskId, requestId, taskStatus, model }
 */
async function generateVideoZhipu(options) {
  try {
    const apiKey = config.zhipuApiKey;
    if (!apiKey) {
      throw new Error("Zhipu AI API Key 未配置");
    }
    
    const client = zhipuProvider.createClient(apiKey);
    // 固定使用免費模型
    const modelName = "cogvideox-flash";
    
    const videoOptions = {
      quality: options.quality || "speed",
      withAudio: options.withAudio !== undefined ? options.withAudio : false,
      size: options.size || "1920x1080",
      fps: parseInt(options.fps) || 30,
      duration: parseInt(options.duration) || 5,
      imageUrl: options.imageUrl,
    };
    
    const result = await zhipuProvider.generateVideo(
      options.prompt,
      modelName,
      videoOptions,
      client
    );
    
    return result;
  } catch (error) {
    logger.error(`Zhipu AI 視頻生成錯誤: ${error.message}`);
    throw error;
  }
}

/**
 * 查詢Zhipu AI 異步任務結果 (用於視頻生成)
 * @param {string} taskId - 任務 ID
 * @returns {Promise<Object>} 任務結果
 */
async function queryVideoResultZhipu(taskId) {
  try {
    const apiKey = config.zhipuApiKey;
    if (!apiKey) {
      throw new Error("Zhipu AI API Key 未配置");
    }
    
    const client = zhipuProvider.createClient(apiKey);
    
    const result = await zhipuProvider.queryAsyncResult(taskId, client);
    
    return result;
  } catch (error) {
    logger.error(`查詢Zhipu AI 視頻任務錯誤: ${error.message}`);
    throw error;
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
            type: "string",
            enum: ["30", "60"],
            description: "Frame rate (FPS). Options: 30 or 60. Default: 30",
            default: "30"
          },
          duration: {
            type: "string",
            enum: ["5", "10"],
            description: "Video duration in seconds. Options: 5 or 10. Default: 5",
            default: "5"
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

module.exports = {
  // Tavily APIs
  tavilySearch,
  tavilyExtract,
  tavilyCrawl,
  tavilyMap,
  // Cloudflare
  generateImageCloudflare,
  // DuckDuckGo
  searchDuckDuckGoLite,
  // Zhipu AI
  generateImageZhipu,
  generateVideoZhipu,
  queryVideoResultZhipu,
  // Utils
  processGeneratedImage,
  // Definitions
  getToolDefinitions
};