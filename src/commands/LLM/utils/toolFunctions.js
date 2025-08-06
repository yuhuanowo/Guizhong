const fetch = require("node-fetch");
const axios = require("axios");
const cheerio = require("cheerio");
const logger = require("../../../utils/logger.js");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const { AttachmentBuilder } = require("discord.js");
const config = require("../../../config.js");

/**
 * 通过Cloudflare API生成图片
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
    const response = await axios.get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: { "User-Agent": "Mozilla/5.0" }
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

      results.push({ title, url });
    });

    // 获取网页内容、解析域名与图标
    for (let result of results) {
      try {
        const siteRes = await axios.get(result.url);
        const $site = cheerio.load(siteRes.data);
        const domain = new URL(result.url).hostname;
        const icon = `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(domain)}`;
        const description = $site('meta[name="description"]').attr('content') || 
                           $site('meta[property="og:description"]').attr('content') || 
                           $site('meta[name="twitter:description"]').attr('content') || 
                           $site.text().slice(0, 200);
        result.icon = icon;
        result.domain = domain;
        result.contentSnippet = description;
      } catch {
        // 若无法连接网站则只返回基本信息
        result.icon = null;
        result.domain = null;
        result.contentSnippet = null;
      }
    }

    return results;
  } catch (error) {
    console.error("Search error:", error.message);
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
  const tempFilePath = `./recordings/${uuidv4()}.jpg`;
  fs.writeFileSync(tempFilePath, base64Data, "base64");
  const attachment = new AttachmentBuilder(tempFilePath);
  
  return {
    path: tempFilePath,
    attachment
  };
}

module.exports = {
  generateImageCloudflare,
  searchDuckDuckGoLite,
  processGeneratedImage
};