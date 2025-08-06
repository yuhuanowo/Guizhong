/**
 * Google AI Studio Gemini Provider
 * 处理所有Google AI Gemini模型API调用
 */
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fetch = require("node-fetch");
const logger = require("../../../../utils/logger.js");

/**
 * 创建Gemini客户端
 * @param {string} apiKey API令牌
 * @returns {Object} Gemini客户端
 */
function createClient(apiKey) {
  return new GoogleGenerativeAI(apiKey);
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
  
  // Gemini 支持音频输入（Gemini 2.0+ 和部分 1.5 模型）
  const audioSupportedModels = [
    "gemini-2.0-flash-exp",
    "gemini-2.0-flash-thinking-exp-1219", 
    "gemini-1.5-pro",
    "gemini-1.5-pro-002",
    "gemini-1.5-flash",
    "gemini-1.5-flash-002"
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
      
      // 转换消息格式以适应Gemini API
      if (Array.isArray(msg.content)) {
        const parts = [];
        for (const part of msg.content) {
          if (part.type === "text") {
            parts.push({ text: part.text });
          } else if (part.type === "image_url" && part.image_url.url.startsWith('data:image/')) {
            // 从Base64提取图像数据
            const base64Data = part.image_url.url.split(',')[1];
            const mimeType = part.image_url.url.split(';')[0].split(':')[1];
            parts.push({
              inlineData: {
                data: base64Data,
                mimeType: mimeType
              }
            });
          } else if (part.type === "image" && part.image.data) {
            // 直接的图像数据
            parts.push({
              inlineData: {
                data: part.image.data,
                mimeType: part.image.mimeType
              }
            });
          } else if (part.type === "audio" && part.audio.data) {
            // Gemini 2.0+ 支持音频
            parts.push({
              inlineData: {
                data: part.audio.data,
                mimeType: part.audio.mimeType
              }
            });
          }
        }
        processedMessages.push({ role: msg.role, parts });
      } else {
        processedMessages.push({ role: msg.role, parts: [{ text: msg.content }] });
      }
    }
    
    // 创建Gemini生成配置
    let modelConfig = { model: modelName };
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
      generationConfig.temperature = 0.1;
    } else if (modelName.includes("2.0")) {
      // Gemini 2.0 模型支持更长输出
      generationConfig.maxOutputTokens = 10000;
    }
    
    // 函数调用支持 - 大多数 Gemini 模型都支持
    const toolSupportedModels = [
      "gemini-2.0-flash-exp",
      "gemini-2.0-flash-thinking-exp-1219",
      "gemini-1.5-pro", 
      "gemini-1.5-pro-002",
      "gemini-1.5-flash",
      "gemini-1.5-flash-002", 
      "gemini-1.5-flash-8b",
      "gemini-exp-1206",
      "gemini-exp-1121", 
      "gemini-exp-1114"
    ];
    
    if (toolSupportedModels.includes(modelName) && tools && tools.length > 0) {
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
        modelConfig.tools = [{
          functionDeclarations
        }];
        
        // Gemini 2.0 支持工具配置
        if (modelName.includes("2.0")) {
          modelConfig.toolConfig = {
            functionCallingConfig: {
              mode: "AUTO" // 自动选择是否调用函数
            }
          };
        }
      }
    }
    
    // 创建模型实例
    const genModel = client.getGenerativeModel(modelConfig, { generationConfig });
    
    // 设置系统指令（如果模型支持）
    let chatOptions = {};
    if (systemPrompt && modelName.includes("1.5") || modelName.includes("2.0")) {
      chatOptions.systemInstruction = { parts: [{ text: systemPrompt }] };
    }
    
    // 创建聊天会话
    const chat = genModel.startChat(chatOptions);
    
    // 获取最后一条用户消息
    const lastUserMessage = processedMessages[processedMessages.length - 1];
    
    // 发送请求
    const result = await chat.sendMessage(lastUserMessage.parts);
    const response = result.response;
    
    // 将Gemini响应格式转换为通用格式
    let responseContent = "";
    let toolCalls = null;
    
    // 处理文本响应
    if (response.text) {
      responseContent = response.text();
    }
    
    // 处理函数调用
    if (response.functionCalls && response.functionCalls.length > 0) {
      toolCalls = response.functionCalls.map((call, index) => ({
        id: `call_${Date.now()}_${index}`,
        type: "function",
        function: {
          name: call.name,
          arguments: JSON.stringify(call.args || {})
        }
      }));
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
          prompt_tokens: result.response?.usageMetadata?.promptTokenCount || 0,
          completion_tokens: result.response?.usageMetadata?.candidatesTokenCount || 0,
          total_tokens: result.response?.usageMetadata?.totalTokenCount || 0
        }
      }
    };
  } catch (error) {
    logger.error(`Gemini请求失败: ${error.message}`);
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
