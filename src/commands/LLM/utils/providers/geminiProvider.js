/**
 * Google AI Studio Gemini Provider
 * 处理所有Google AI Gemini模型API调用
 */
const { GoogleGenAI } = require("@google/genai");
const fetch = require("node-fetch");
const logger = require("../../../../utils/logger.js");

// API Key 輪流機制
let apiKeys = [];
let currentKeyIndex = 0;

/**
 * 初始化 API Keys
 * @param {string|string[]} keys 單個 API Key 或 API Key 陣列
 */
function initApiKeys(keys) {
  if (Array.isArray(keys)) {
    apiKeys = keys.filter(k => k && k.trim() !== "");
  } else if (typeof keys === "string" && keys.trim() !== "") {
    // 支援逗號分隔的多個 Key
    apiKeys = keys.split(",").map(k => k.trim()).filter(k => k !== "");
  } else {
    apiKeys = [];
  }
  
  if (apiKeys.length > 1) {
    logger.info(`Gemini Provider: 已載入 ${apiKeys.length} 個 API Keys，將使用輪流機制`);
  } else if (apiKeys.length === 1) {
    logger.info(`Gemini Provider: 使用單一 API Key`);
  }
}

/**
 * 獲取下一個 API Key（輪流機制）
 * @returns {string} API Key
 */
function getNextApiKey() {
  if (apiKeys.length === 0) {
    logger.warn("Gemini Provider: 沒有可用的 API Key");
    return "";
  }
  
  const key = apiKeys[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
  
  if (apiKeys.length > 1) {
    logger.info(`Gemini Provider: 使用 API Key #${currentKeyIndex === 0 ? apiKeys.length : currentKeyIndex}`);
  }
  
  return key;
}

/**
 * 创建Gemini客户端
 * @param {string|string[]} apiKeyOrKeys 單個 API Key、逗號分隔的 Keys 字串、或 API Key 陣列
 * @returns {Object} Gemini客户端
 */
function createClient(apiKeyOrKeys) {
  // 初始化 API Keys（如果尚未初始化或有新的 keys）
  initApiKeys(apiKeyOrKeys);
  
  // 使用輪流機制獲取 API Key
  const apiKey = getNextApiKey();
  return new GoogleGenAI({ apiKey });
}

/**
 * 获取系统提示
 * @param {string} language 语言
 * @param {Object} prompts 提示语对象
 * @returns {Object} 系统提示对象
 */
function getSystemPrompt(language, prompts) {
  let basePrompt = prompts[language] || prompts['zh-TW'];
  basePrompt = basePrompt + "語言選擇: " + language;
  
  // Gemini使用system作为role
  return { role: "system", content: basePrompt };
}

/**
 * 处理用户消息格式
 * @param {string} prompt 用户提示
 * @param {Object} image 图片附件
 * @param {Object} audio 音频附件
 * @returns {Promise<Array>} 格式化后的用户消息
 */
async function formatUserMessage(prompt, image, audio) {
  let userMessage = [{ role: "user", content: prompt }];
  
  // Gemini 支持图片 - 全系列模型都支持多模态
  if (image) {
    try {
      const imageData = await fetch(image.url).then(res => res.buffer());
      const mimeType = image.contentType || "image/jpeg";
      
      userMessage = [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image", image: { 
              data: imageData,
              mimeType: mimeType
            }}
          ]
        }
      ];
    } catch (error) {
      logger.error(`处理Gemini图片失败: ${error.message}`);
    }
  }
  
  // Gemini 支持音频输入（Gemini 1.5+ 全系列模型）
  const audioSupportedModels = [
    "gemini-3-pro",
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash-lite-preview-09-2025",
    "gemini-2.5-flash-preview-09-2025",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
  ];
  
  if (audio && audioSupportedModels.some(model => userMessage[0].modelName?.includes(model))) {
    try {
      const audioData = await fetch(audio.url).then(res => res.buffer());
      const mimeType = audio.contentType || "audio/wav";
      
      // 如果同时有图片，添加到现有内容
      if (image) {
        userMessage[0].content.push({
          type: "audio",
          audio: {
            data: audioData,
            mimeType: mimeType
          }
        });
      } else {
        userMessage = [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "audio", audio: {
                data: audioData,
                mimeType: mimeType
              }}
            ]
          }
        ];
      }
    } catch (error) {
      logger.error(`处理Gemini音频失败: ${error.message}`);
    }
  }
  
  return userMessage;
}

/**
 * 发送Gemini请求
 * @param {Array} messages 消息数组
 * @param {string} modelName 模型名称
 * @param {Array} tools 工具数组
 * @param {Object} client Gemini客户端
 * @returns {Promise<Object>} 响应结果
 */
async function sendRequest(messages, modelName, tools, client) {
  try {
    // 从消息中提取文本和多模态内容
    const processedMessages = [];
    let systemPrompt = "";
    
    for (const msg of messages) {
      if (msg.role === "system") {
        systemPrompt = msg.content;
        continue;
      }
      
      // 轉換角色名稱以適應 Gemini API
      let geminiRole = msg.role;
      if (msg.role === "assistant") {
        geminiRole = "model";
      } else if (msg.role === "tool") {
        // Gemini 使用 "function" 而不是 "tool"
        geminiRole = "function";
      }
      
      // 处理工具/函数响应
      if (msg.role === "tool") {
        // 工具響應需要特殊格式，在 Google GenAI SDK 中，工具響應是 user 角色的一部分
        try {
          // 嘗試解析內容，如果是 JSON 字符串
          let contentObj = msg.content;
          try {
            if (typeof msg.content === 'string') {
                contentObj = JSON.parse(msg.content);
            }
          } catch (e) {
            // 如果不是 JSON，則包裝在對象中
            contentObj = { result: msg.content };
          }

          const functionResponse = {
            name: msg.name,
            response: contentObj
          };
          
          processedMessages.push({
            role: "user", // 修正：工具響應應使用 user 角色
            parts: [{ functionResponse }]
          });
        } catch (error) {
          logger.warn(`處理工具響應時出錯: ${error.message}`);
          // 降級為普通文本消息
          processedMessages.push({
            role: "user",
            parts: [{ text: `Function result for ${msg.name}: ${msg.content}` }]
          });
        }
        continue;
      }
      
      // 转换消息格式以适应Gemini API
      if (Array.isArray(msg.content)) {
        const parts = [];
        for (const part of msg.content) {
          if (part.type === "text") {
            parts.push({ text: part.text });
          } else if (part.type === "image_url" && part.image_url?.url) {
            if (part.image_url.url.startsWith('data:image/')) {
              // 从Base64提取图像数据
              const base64Data = part.image_url.url.split(',')[1];
              const mimeType = part.image_url.url.split(';')[0].split(':')[1];
              parts.push({
                inlineData: {
                  data: base64Data,
                  mimeType: mimeType
                }
              });
            }
          } else if (part.type === "image" && part.image?.data) {
            // 直接的图像数据 - 需要确保是base64字符串
            const imageData = Buffer.isBuffer(part.image.data) 
              ? part.image.data.toString('base64')
              : part.image.data;
            parts.push({
              inlineData: {
                data: imageData,
                mimeType: part.image.mimeType
              }
            });
          } else if (part.type === "audio" && part.audio?.data) {
            // Gemini 2.0+ 支持音频
            const audioData = Buffer.isBuffer(part.audio.data)
              ? part.audio.data.toString('base64')
              : part.audio.data;
            parts.push({
              inlineData: {
                data: audioData,
                mimeType: part.audio.mimeType
              }
            });
          }
        }
        // 使用之前確定的角色
        processedMessages.push({ 
          role: geminiRole, 
          parts 
        });
      } else {
        processedMessages.push({ 
          role: geminiRole, 
          parts: [{ text: msg.content }] 
        });
      }
    }
    
    // 创建Gemini生成配置
    let generationConfig = {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192
    };
    
    // 为特定模型优化配置
    if (modelName.includes("thinking")) {
      // 思考模型需要更高的输出长度
      generationConfig.maxOutputTokens = 12000;
      generationConfig.temperature = 0.1; // 思考模型通常需要較低溫度
    } else if (modelName.includes("gemini-3")) {
      // Gemini 3 模型建議使用默認溫度 (1.0)
      // 移除 temperature 設置以使用默認值
      delete generationConfig.temperature;
      generationConfig.maxOutputTokens = 8192;
    } else if (modelName.includes("2.0") || modelName.includes("2.5")) {
      // Gemini 2.0/2.5 模型支持更长输出
      generationConfig.maxOutputTokens = 10000;
    }
    
    // 函数调用支持配置
    const toolSupportedModels = [
      "gemini-3-pro",
      "gemini-2.5-pro",
      "gemini-2.5-flash",
      "gemini-2.5-flash-preview-09-2025",
      "gemini-2.5-flash-lite-preview-09-2025",
      "gemini-2.5-flash-lite",
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
    ];
    
    // 准备工具配置
    let toolsConfig = [];
    let toolConfig = null;
    
    const isToolSupported = toolSupportedModels.some(supported => modelName.includes(supported));
    
    if (isToolSupported && tools && tools.length > 0) {
      const functionDeclarations = tools.map(tool => {
        if (tool.type === "function") {
          return {
            name: tool.function.name,
            description: tool.function.description,
            parameters: tool.function.parameters
          };
        }
        return null;
      }).filter(Boolean);
      
      if (functionDeclarations.length > 0) {
        toolsConfig = [{
          functionDeclarations: functionDeclarations
        }];
        
        // 配置工具调用模式 (Gemini 1.5+ 和 2.0+ 和 3.0+ 支持)
        if (modelName.includes("1.5") || modelName.includes("2.0") || modelName.includes("2.5") || modelName.includes("3.0") || modelName.includes("gemini-3")) {
          toolConfig = {
            functionCallingConfig: {
              mode: "AUTO" // AUTO, ANY, NONE
            }
          };
        }
      }
    } else if (!isToolSupported && tools && tools.length > 0) {
      logger.warn(`模型 ${modelName} 不支持工具調用`);
    }
    
    // 构建最终配置
    const config = {
        ...generationConfig
    };

    if (toolsConfig.length > 0) {
        config.tools = toolsConfig;
    }
    
    if (toolConfig) {
        config.toolConfig = toolConfig;
    }
    
    if (systemPrompt && (modelName.includes("1.5") || modelName.includes("2.0") || modelName.includes("2.5") || modelName.includes("3.0") || modelName.includes("gemini-3"))) {
        config.systemInstruction = {
            parts: [{ text: systemPrompt }]
        };
    }

    // 发送请求
    const result = await client.models.generateContent({
        model: modelName,
        contents: processedMessages,
        config: config
    });
    
    // 将Gemini响应格式转换为通用格式
    let responseContent = "";
    let toolCalls = null;
    
    // 处理文本响应
    try {
      // 手動提取文本以避免 SDK 在存在函數調用時發出警告
      if (result.candidates && result.candidates[0]?.content?.parts) {
        responseContent = result.candidates[0].content.parts
          .filter(part => part.text)
          .map(part => part.text)
          .join('');
      } else {
        // 後備方案
        const text = result.text;
        if (text) {
          responseContent = text;
        }
      }
    } catch (e) {
      // 如果没有文本内容（例如只有函数调用），忽略错误
      // logger.error(`無文本響應: ${e.message}`);
    }
    
    // 处理函数调用
    const functionCalls = result.functionCalls;
    
    if (functionCalls && functionCalls.length > 0) {
      logger.info(`Gemini 響應包含 ${functionCalls.length} 個函數調用`);
      toolCalls = functionCalls.map((call, index) => {
        // logger.info(`函數調用: ${call.name}(${JSON.stringify(call.args || {})})`);
        return {
          id: `call_${Date.now()}_${index}`,
          type: "function",
          function: {
            name: call.name,
            arguments: JSON.stringify(call.args || {})
          }
        };
      });
    }
    
    // 返回统一格式的响应
    return {
      status: "200",
      body: {
        choices: [{
          message: {
            role: "assistant", 
            content: responseContent,
            tool_calls: toolCalls
          },
          finish_reason: toolCalls && toolCalls.length > 0 ? "tool_calls" : "stop"
        }],
        usage: {
          prompt_tokens: result.usageMetadata?.promptTokenCount || 0,
          completion_tokens: result.usageMetadata?.candidatesTokenCount || 0,
          total_tokens: result.usageMetadata?.totalTokenCount || 0
        }
      }
    };
  } catch (error) {
    logger.error(`Gemini请求失败: ${error.message}`);
    logger.error(`错误堆栈: ${error.stack}`);
    return {
      status: "400", 
      body: {
        error: {
          message: error.message,
          type: "Gemini API Error",
          details: error.stack
        }
      }
    };
  }
}

module.exports = {
  createClient,
  getSystemPrompt,
  formatUserMessage,
  sendRequest
};
