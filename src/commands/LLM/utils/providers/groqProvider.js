/**
 * Groq Provider
 * 处理所有Groq API调用
 */
const { Groq } = require("groq-sdk");
const fetch = require("node-fetch");
const logger = require("../../../../utils/logger.js");

/**
 * 创建Groq客户端
 * @param {string} apiKey Groq API密钥
 * @returns {Object} Groq客户端
 */
function createClient(apiKey) {
  return new Groq({ apiKey });
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
  
  return { role: "system", content: basePrompt };
}

/**
 * 处理用户消息格式
 * @param {string} prompt 用户提示
 * @param {Object} image 图片附件
 * @returns {Promise<Array>} 格式化后的用户消息
 */
async function formatUserMessage(prompt, image) {
  let userMessage = [{ role: "user", content: prompt }];
  
  // Groq 支持视觉模型（Llama 3.2 Vision 系列）
  const visionModels = [
    "llama-3.2-11b-vision-preview",
    "llama-3.2-90b-vision-preview"
  ];
  
  // 检查当前模型是否支持视觉（需要在调用时传入模型名）
  if (image) {
    try {
      const imageData = await fetch(image.url).then(res => res.buffer());
      const base64Image = imageData.toString("base64");
      const mimeType = image.contentType || "image/jpeg";
      
      userMessage = [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { 
              type: "image_url", 
              image_url: { 
                url: `data:${mimeType};base64,${base64Image}`,
                detail: "high"
              }
            }
          ]
        }
      ];
    } catch (error) {
      logger.error(`处理Groq图片失败: ${error.message}`);
      logger.warn("图片处理失败，将使用纯文本模式");
    }
  }
  
  return userMessage;
}

/**
 * 发送Groq请求
 * @param {Array} messages 消息数组
 * @param {string} modelName 模型名称
 * @param {Array} tools 工具数组
 * @param {Object} client Groq客户端
 * @returns {Promise<Object>} 响应结果
 */
async function sendRequest(messages, modelName, tools, client) {
  try {
    // 转换消息格式
    const groqMessages = messages.map(msg => {
      if (Array.isArray(msg.content)) {
        // 处理多模态内容
        return {
          role: msg.role,
          content: msg.content.map(part => {
            if (part.type === "text") {
              return { type: "text", text: part.text };
            } else if (part.type === "image_url") {
              return { type: "image_url", image_url: part.image_url };
            }
            return part;
          })
        };
      } else {
        return {
          role: msg.role,
          content: msg.content
        };
      }
    });
    
    // 准备请求选项
    const requestOptions = {
      messages: groqMessages,
      model: modelName,
      temperature: 0.7,
      max_tokens: 4096,
      top_p: 1,
      stream: false
    };
    
    // 工具调用支持检查
    const toolSupportedModels = [
      "llama-3.3-70b-versatile",
      "llama-3.1-405b-reasoning", 
      "llama-3.1-70b-versatile", 
      "llama-3.1-8b-instant",
      "llama-3.2-1b-preview", 
      "llama-3.2-3b-preview",
      "mixtral-8x7b-32768",
      "gemma-7b-it", 
      "gemma2-9b-it",
      "llama3-groq-70b-8192-tool-use-preview", 
      "llama3-groq-8b-8192-tool-use-preview"
    ];
    
    // 添加工具（如果模型支持）
    if (tools && tools.length > 0 && toolSupportedModels.includes(modelName)) {
      requestOptions.tools = tools;
      requestOptions.tool_choice = "auto";
    }
    
    // 针对特定模型优化参数
    if (modelName.includes("reasoning")) {
      requestOptions.temperature = 0.1; // 推理模型使用低温度
      requestOptions.max_tokens = 6000;
    } else if (modelName.includes("tool-use")) {
      requestOptions.temperature = 0.3; // 工具使用模型
    } else if (modelName.includes("vision")) {
      requestOptions.max_tokens = 2048; // 视觉模型
    }
    
    // 发送请求到 Groq API
    const completion = await client.chat.completions.create(requestOptions);
    
    // 检查是否有工具调用
    const toolCalls = completion.choices[0]?.message?.tool_calls;
    
    // 构建通用格式响应
    return {
      status: "200",
      body: {
        choices: [{
          message: {
            role: "assistant",
            content: completion.choices[0].message.content || "",
            tool_calls: toolCalls
          },
          finish_reason: toolCalls ? "tool_calls" : completion.choices[0].finish_reason
        }],
        usage: {
          prompt_tokens: completion.usage?.prompt_tokens || 0,
          completion_tokens: completion.usage?.completion_tokens || 0,
          total_tokens: completion.usage?.total_tokens || 0
        },
        model: completion.model || modelName
      }
    };
  } catch (error) {
    logger.error(`Groq请求失败: ${error.message}`);
    return {
      status: "400",
      body: {
        error: {
          message: error.message,
          type: "Groq API Error",
          details: error.response?.data || error.stack
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
