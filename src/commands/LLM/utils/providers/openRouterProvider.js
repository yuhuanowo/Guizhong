/**
 * OpenRouter Provider
 * 处理所有OpenRouter API调用
 */
const fetch = require("node-fetch");
const logger = require("../../../../utils/logger.js");

/**
 * 创建OpenRouter客户端
 * @param {string} apiKey OpenRouter API密钥
 * @returns {Object} OpenRouter客户端配置
 */
function createClient(apiKey) {
  return {
    apiKey,
    baseUrl: "https://openrouter.ai/api/v1"
  };
}

/**
 * 获取系统提示
 * @param {string} modelName 模型名称
 * @param {string} language 语言
 * @param {Object} prompts 提示语对象
 * @returns {Object} 系统提示对象
 */
function getSystemPrompt(modelName, language, prompts) {
  let basePrompt = prompts[language] || prompts['zh-TW'];
  basePrompt = basePrompt + "語言選擇: " + language;
  
  // 对于Claude模型，使用特定的系统指令格式
  if (modelName.includes("claude")) {
    return { role: "system", content: basePrompt };
  }
  
  return { role: "system", content: basePrompt };
}

/**
 * 处理用户消息格式
 * @param {string} prompt 用户提示
 * @param {Object} image 图片附件
 * @param {string} modelName 模型名称
 * @returns {Promise<Array>} 格式化后的用户消息
 */
async function formatUserMessage(prompt, image, modelName) {
  let userMessage = [{ role: "user", content: prompt }];
  
  // 处理图像（支持更多多模态模型）
  if (image) {
    try {
      // 扩展支持的多模态模型列表 (2025年更新)
      const supportMultimodal = modelName.includes("claude-3") || 
                              modelName.includes("gpt-4o") || 
                              modelName.includes("gpt-4-turbo") ||
                              modelName.includes("gpt-4-vision") ||
                              modelName.includes("gemini") ||
                              modelName.includes("gemma-3") ||
                              modelName.includes("llama-3.2-vision") || 
                              modelName.includes("llama-4") ||
                              modelName.includes("qwen-vl") ||
                              modelName.includes("qwen2.5-vl") ||
                              modelName.includes("pixtral") ||
                              modelName.includes("nova-pro") ||
                              modelName.includes("nova-lite") ||
                              modelName.includes("internvl") ||
                              modelName.includes("phi-4-multimodal") ||
                              modelName.includes("grok-vision") ||
                              modelName.includes("mistral") && modelName.includes("vision");
      
      if (supportMultimodal) {
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
                  detail: "high" // 启用高精度图像分析
                }
              }
            ]
          }
        ];
      } else {
        logger.warn(`模型 ${modelName} 不支持图像输入，图像将被忽略`);
      }
    } catch (error) {
      logger.error(`处理OpenRouter图片失败: ${error.message}`);
    }
  }
  
  return userMessage;
}

/**
 * 发送OpenRouter请求
 * @param {Array} messages 消息数组
 * @param {string} modelName 模型名称
 * @param {Array} tools 工具数组
 * @param {Object} client OpenRouter客户端
 * @returns {Promise<Object>} 响应结果
 */
async function sendRequest(messages, modelName, tools, client) {
  try {
    // 准备请求正文
    const requestBody = {
      model: modelName,
      messages: messages,
      temperature: 0.7,
      max_tokens: 4000,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    };
    
    // 工具调用支持 - 扩展支持的模型列表 (2025年更新)
    if (tools && tools.length > 0) {
      const supportTools = 
        modelName.includes("claude") || 
        modelName.includes("gpt-4o") ||
        modelName.includes("gpt-4") ||
        modelName.includes("gpt-3.5-turbo") ||
        modelName.includes("gemini") ||
        modelName.includes("gemma-3") ||
        modelName.includes("llama-3") ||
        modelName.includes("llama-4") ||
        modelName.includes("qwen") ||
        modelName.includes("mistral") ||
        modelName.includes("mixtral") ||
        modelName.includes("codestral") ||
        modelName.includes("magistral") ||
        modelName.includes("command-r") ||
        modelName.includes("phi-4") ||
        modelName.includes("nova");
      
      if (supportTools) {
        requestBody.tools = tools;
        requestBody.tool_choice = "auto";
      }
    }
    
    // 推理模式支持 (DeepSeek-R1, OpenAI o1/o3系列等)
    if (modelName.includes("deepseek-r1") || 
        modelName.includes("o1") || 
        modelName.includes("o3") ||
        modelName.includes("qwq") ||
        modelName.includes("thinking") ||
        modelName.includes("glm-4.5")) {
      requestBody.reasoning = { enabled: true };
      requestBody.include_reasoning = false; // 默认不包含推理过程
      requestBody.temperature = 0.1; // 推理模型使用低温度
      requestBody.max_tokens = 32768; // 推理模型需要更多token
    }
    
    // 根据模型优化参数
    if (modelName.includes("gpt-4o")) {
      requestBody.max_tokens = 16384;
    } else if (modelName.includes("claude-3") && modelName.includes("opus")) {
      requestBody.max_tokens = 4096;
    } else if (modelName.includes("gemini-pro")) {
      requestBody.max_tokens = 8192;
      requestBody.temperature = 0.9;
    } else if (modelName.includes("llama-4")) {
      requestBody.max_tokens = 16384;
      requestBody.temperature = 0.8;
    }
    
    // 发送请求到OpenRouter API
    const response = await fetch(`${client.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${client.apiKey}`,
        "HTTP-Referer": "https://github.com/NianBroken/Guizhong", // 标识应用
        "X-Title": "Guizhong Discord Bot" // 应用名称
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }
    
    const result = await response.json();
    
    // 处理工具调用
    const hasToolCalls = result.choices && 
                       result.choices[0] && 
                       result.choices[0].message && 
                       result.choices[0].message.tool_calls;
    
    // 返回统一格式的响应
    return {
      status: "200",
      body: {
        choices: [{
          message: {
            role: result.choices[0].message.role || "assistant",
            content: result.choices[0].message.content || "",
            tool_calls: result.choices[0].message.tool_calls
          },
          finish_reason: hasToolCalls ? "tool_calls" : result.choices[0].finish_reason
        }],
        usage: {
          prompt_tokens: result.usage?.prompt_tokens || 0,
          completion_tokens: result.usage?.completion_tokens || 0,
          total_tokens: result.usage?.total_tokens || 0
        },
        model: result.model || modelName,
        id: result.id
      }
    };
  } catch (error) {
    logger.error(`OpenRouter请求失败: ${error.message}`);
    return {
      status: "400",
      body: {
        error: {
          message: error.message,
          type: "OpenRouter API Error",
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
