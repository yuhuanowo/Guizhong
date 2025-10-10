/**
 * 標題生成服務
 * 使用 Gemma 3n 模型根據對話內容生成簡潔的標題
 */

const llmService = require('./llmService');
const logger = require("../../../utils/logger.js");

/**
 * 使用 Gemma 3n 生成對話標題
 * @param {string} prompt - 用戶的問題/提示
 * @param {string} response - AI 的回應
 * @param {string} language - 語言代碼 (zh-TW, zh-CN, en 等)
 * @returns {Promise<string>} 生成的標題，如果失敗則返回默認標題
 */
async function generateTitle(prompt, response, language = 'zh-TW') {
  try {
    // 根據語言選擇指示
    const instructions = {
      'zh-TW': '請根據以下用戶問題，生成一個簡潔的標題（15個字以內，不需要加引號），標題應該能夠概括用戶的主要問題或需求：',
      'zh-CN': '请根据以下用户问题，生成一个简洁的标题（15个字以内，不需要加引号），标题应该能够概括用户的主要问题或需求：',
      'en': 'Generate a concise title (within 15 words, no quotes needed) based on the following user question. The title should summarize the main question or need:'
    };

    const instruction = instructions[language] || instructions['zh-TW'];

    // 截斷過長的內容以節省 token，主要關注用戶問題
    const truncatedPrompt = prompt.length > 300 ? prompt.substring(0, 300) + '...' : prompt;

    const titlePrompt = `${instruction}

用戶問題：${truncatedPrompt}

標題：`;

    // 使用 Gemma 3n 模型生成標題
    const client = llmService.createLLMClient('gemma-3n-e4b-it');
    const messages = [
      {
        role: 'user',
        content: titlePrompt
      }
    ];

    const response_data = await llmService.sendLLMRequest(messages, 'gemma-3n-e4b-it', [], client);

    if (response_data.status === "200" && response_data.body.choices && response_data.body.choices.length > 0) {
      let title = response_data.body.choices[0].message.content.trim();
      
      // 移除可能的引號和多餘的標點
      title = title.replace(/^["'「『]+|["'」』]+$/g, '').trim();
      
      // 如果標題太長，截斷它
      if (title.length > 50) {
        title = title.substring(0, 47) + '...';
      }

      logger.info(`成功生成標題: ${title}`);
      return title;
    }

    logger.warn('標題生成失敗: 無有效響應');
    return getDefaultTitle(language);

  } catch (error) {
    logger.error('標題生成錯誤:', error);
    return getDefaultTitle(language);
  }
}

/**
 * 獲取默認標題
 * @param {string} language - 語言代碼
 * @returns {string} 默認標題
 */
function getDefaultTitle(language) {
  const defaultTitles = {
    'zh-TW': 'AI 對話',
    'zh-CN': 'AI 对话',
    'en': 'AI Conversation'
  };

  return defaultTitles[language] || defaultTitles['zh-TW'];
}

module.exports = {
  generateTitle,
  getDefaultTitle
};
