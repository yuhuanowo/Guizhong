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
      fps: options.fps || 30,
      duration: options.duration || 5,
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
  processGeneratedImage
};