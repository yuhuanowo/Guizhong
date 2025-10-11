/**
 * Zhipu AI Provider
 * 支援 GLM 系列文本模型、視覺模型、CogView 圖像生成、CogVideoX 視頻生成、語音模型等
 * 官方文檔: https://docs.bigmodel.cn/cn/api
 */
const fetch = require("node-fetch");
const logger = require("../../../../utils/logger.js");

// API 基礎配置
const API_BASE_URL = "https://open.bigmodel.cn/api/paas/v4";

// 模型分類定義
const MODEL_TYPES = {
  // 文本對話模型 (LLM)
  TEXT: [
      "glm-4.6", "glm-4.5-air", "glm-4.5-flash", "glm-4-flash-250414", "glm-z1-flash",


  ],
  
  // 視覺理解模型 (VLM)
  VISION: [
    "glm-4.5v", "glm-4.1v-thinking-flash", "glm-4v-flash",
  ],
  
  // 圖像生成模型
  IMAGE_GEN: [
    "cogview-3-flash",
  ],
  
  // 視頻生成模型
  VIDEO_GEN: [
    "cogvideox-flash",

  ],
  

};

/**
 * 判斷模型類型
 * @param {string} modelName 模型名稱
 * @returns {string} 模型類型
 */
function getModelType(modelName) {
  const lowerModel = modelName.toLowerCase();
  
  for (const [type, models] of Object.entries(MODEL_TYPES)) {
    if (models.includes(lowerModel)) {
      return type;
    }
  }
  
  // 默認為文本模型
  return "TEXT";
}

/**
 * 創建Zhipu AI 客戶端
 * @param {string} apiKey API 密鑰
 * @returns {Object} 客戶端配置
 */
function createClient(apiKey) {
  if (!apiKey) {
    throw new Error("Zhipu AI API Key 未配置");
  }
  
  return {
    apiKey,
    baseURL: API_BASE_URL,
  };
}

/**
 * 獲取系統提示
 * @param {string} modelName 模型名稱
 * @param {string} language 語言
 * @param {Object} prompts 提示詞映射
 * @returns {Object|null} 系統提示對象
 */
function getSystemPrompt(modelName, language, prompts) {
  const modelType = getModelType(modelName);
  
  // 圖像、視頻、音頻生成模型不需要系統提示
  if (["IMAGE_GEN", "VIDEO_GEN", "EMBEDDING"].includes(modelType)) {
    return null;
  }
  
  return {
    role: "system",
    content: prompts[language] || prompts['zh-TW']
  };
}

/**
 * 格式化用戶消息
 * @param {string} prompt 用戶提示
 * @param {Object} image 圖片附件
 * @param {Object} audio 音頻附件
 * @param {string} modelName 模型名稱
 * @returns {Promise<Array>} 格式化後的消息數組
 */
async function formatUserMessage(prompt, image, audio, modelName) {
  const modelType = getModelType(modelName);
  const lowerModel = modelName.toLowerCase();
  
  // 視覺模型支持圖片輸入
  if (modelType === "VISION" && image) {
    const content = [
      {
        type: "text",
        text: prompt
      }
    ];
    
    // 添加圖片 URL 或 Base64
    if (image.url) {
      content.push({
        type: "image_url",
        image_url: {
          url: image.url
        }
      });
    } else if (image.base64) {
      content.push({
        type: "image_url",
        image_url: {
          url: `data:${image.mimeType || 'image/jpeg'};base64,${image.base64}`
        }
      });
    }
    
    return [{
      role: "user",
      content: content
    }];
  }
  
  // 語音模型支持音頻輸入
  if (lowerModel === "glm-4-voice" && audio) {
    const content = [];
    
    if (prompt) {
      content.push({
        type: "text",
        text: prompt
      });
    }
    
    if (audio.base64) {
      content.push({
        type: "audio",
        audio: {
          data: audio.base64,
          format: audio.format || "wav"
        }
      });
    }
    
    return [{
      role: "user",
      content: content
    }];
  }
  
  // 默認文本消息
  return [{
    role: "user",
    content: prompt
  }];
}

/**
 * 處理圖像生成請求
 * @param {string} prompt 生成提示
 * @param {string} modelName 模型名稱
 * @param {Object} client 客戶端配置
 * @returns {Promise<Object>} 生成結果
 */
async function generateImage(prompt, modelName, client) {
  const url = `${client.baseURL}/images/generations`;
  
  const requestBody = {
    model: modelName,
    prompt: prompt,
    size: "1024x1024",
    watermark_enabled: true,
  };
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${client.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Zhipu AI 圖像生成失敗: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      return {
        imageUrl: data.data[0].url,
        created: data.created,
      };
    }
    
    throw new Error("Zhipu AI 圖像生成失敗：未返回圖片 URL");
  } catch (error) {
    logger.error(`Zhipu AI 圖像生成錯誤: ${error.message}`);
    throw error;
  }
}

/**
 * 處理視頻生成請求（異步）
 * @param {string} prompt 生成提示
 * @param {string} modelName 模型名稱
 * @param {Object} options 生成選項
 * @param {Object} client 客戶端配置
 * @returns {Promise<Object>} 任務 ID
 */
async function generateVideo(prompt, modelName, options = {}, client) {
  const url = `${client.baseURL}/videos/generations`;
  
  const requestBody = {
    model: modelName,
    prompt: prompt,
    quality: options.quality || "speed",
    with_audio: options.withAudio !== undefined ? options.withAudio : false,
    watermark_enabled: true,
    size: options.size || "1920x1080",
    fps: options.fps || 30,
    duration: options.duration || 5,
  };
  
  // 如果提供了圖片 URL，添加到請求中
  if (options.imageUrl) {
    requestBody.image_url = options.imageUrl;
  }
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${client.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Zhipu AI 視頻生成失敗: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    return {
      taskId: data.id,
      requestId: data.request_id,
      taskStatus: data.task_status,
      model: data.model,
    };
  } catch (error) {
    logger.error(`Zhipu AI 視頻生成錯誤: ${error.message}`);
    throw error;
  }
}

/**
 * 查詢異步任務結果
 * @param {string} taskId 任務 ID
 * @param {Object} client 客戶端配置
 * @returns {Promise<Object>} 任務結果
 */
async function queryAsyncResult(taskId, client) {
  const url = `${client.baseURL}/async-result/${taskId}`;
  
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${client.apiKey}`,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Zhipu AI 查詢任務失敗: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    logger.error(`Zhipu AI 查詢任務錯誤: ${error.message}`);
    throw error;
  }
}

/**
 * 發送對話請求
 * @param {Array} messages 消息數組
 * @param {string} modelName 模型名稱
 * @param {Array} tools 工具數組
 * @param {Object} client 客戶端配置
 * @returns {Promise<Object>} 響應結果
 */
async function sendRequest(messages, modelName, tools, client) {
  const url = `${client.baseURL}/chat/completions`;
  const lowerModel = modelName.toLowerCase();
  
  const requestBody = {
    model: modelName,
    messages: messages,
    stream: false,
  };
  
  // GLM-4.6 和 GLM-4.5 系列支持思維鏈
  if (lowerModel.startsWith("glm-4.6") || lowerModel.startsWith("glm-4.5")) {
    requestBody.thinking = {
      type: "enabled"
    };
    requestBody.temperature = 1.0;
    requestBody.top_p = 0.95;
  } else if (lowerModel.startsWith("glm-z1")) {
    requestBody.temperature = 0.75;
    requestBody.top_p = 0.9;
  } else {
    requestBody.temperature = 0.75;
    requestBody.top_p = 0.9;
  }
  
  // 添加工具調用支持
  if (tools && tools.length > 0) {
    requestBody.tools = tools;
    requestBody.tool_choice = "auto";
    
    // GLM-4.6 支持工具流式輸出
    if (lowerModel === "glm-4.6") {
      requestBody.tool_stream = false;
    }
  }
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${client.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Zhipu AI 請求失敗: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error("Zhipu AI 返回的響應中沒有 choices");
    }
    
    const choice = data.choices[0];
    const message = choice.message;
    
    // 返回與其他 provider 一致的格式
    return {
      status: "200",
      body: {
        choices: [{
          message: {
            content: message.content || "",
            tool_calls: message.tool_calls || null,
            reasoning_content: message.reasoning_content || null,
            audio: message.audio || null,
          },
          finish_reason: choice.finish_reason,
        }],
        usage: data.usage,
        video_result: data.video_result,
        web_search: data.web_search,
      }
    };
  } catch (error) {
    logger.error(`Zhipu AI 對話請求錯誤: ${error.message}`);
    return {
      status: "500",
      body: {
        error: {
          message: error.message,
          type: "zhipu_api_error",
        }
      }
    };
  }
}

module.exports = {
  createClient,
  getSystemPrompt,
  formatUserMessage,
  sendRequest,
  generateImage,
  generateVideo,
  queryAsyncResult,
  getModelType,
  MODEL_TYPES,
};
