/**
 * Ollama Provider
 * 处理所有Ollama API调用
 */
const fetch = require("node-fetch");
const logger = require("../../../../utils/logger.js");

/**
 * 创建Ollama客户端
 * @param {string} endpoint Ollama API端点
 * @returns {Object} Ollama客户端配置
 */
function createClient(endpoint) {
  return { endpoint: endpoint || "http://localhost:11434" };
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
  
  // Ollama 支持图像（通过多模态模型如 llava, llama3.2-vision 等）
  if (image) {
    try {
      const imageData = await fetch(image.url).then(res => res.buffer());
      const base64Image = imageData.toString("base64");
      
      // Ollama 使用 images 字段处理图片
      userMessage = [
        {
          role: "user",
          content: prompt,
          images: [base64Image] // Ollama 格式
        }
      ];
    } catch (error) {
      logger.error(`处理Ollama图片失败: ${error.message}`);
    }
  }
  
  return userMessage;
}

/**
 * 发送Ollama请求
 * @param {Array} messages 消息数组
 * @param {string} modelName 模型名称
 * @param {Array} tools 工具数组
 * @param {Object} client Ollama客户端
 * @returns {Promise<Object>} 响应结果
 */
async function sendRequest(messages, modelName, tools, client) {
  try {
    // 准备请求体
    const requestBody = {
      model: modelName,
      messages: messages,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        num_ctx: 8192 // 上下文长度
      }
    };
    
    // 工具调用支持 - 基于最新 Ollama 文档
    const toolSupportedModels = [
      // Llama 3.1+ 系列支持工具调用
      "llama3.3", "llama3.2", "llama3.1", "llama3:70b", "llama3:8b",
      // Qwen 系列
      "qwen3", "qwen2.5", "qwen2.5-coder", "qwen2",
      // Mistral 系列  
      "mistral", "mistral-nemo", "mixtral",
      // Gemma 系列
      "gemma3", "gemma2",
      // Code 模型
      "codellama", "codegemma", "starcoder2",
      // 其他支持工具调用的模型
      "deepseek-r1", "phi3", "phi3.5", "phi4"
    ];
    
    const supportsTools = toolSupportedModels.some(model => 
      modelName.includes(model) || modelName.startsWith(model)
    );
    
    if (supportsTools && tools && tools.length > 0) {
      // 转换工具格式为 Ollama 兼容格式
      requestBody.tools = tools.map(tool => {
        if (tool.type === "function") {
          return {
            type: "function",
            function: {
              name: tool.function.name,
              description: tool.function.description,
              parameters: tool.function.parameters
            }
          };
        }
        return tool;
      });
    }
    
    // 针对特定模型优化参数
    if (modelName.includes("code")) {
      requestBody.options.temperature = 0.1; // 代码模型使用更低温度
      requestBody.options.top_p = 0.95;
    } else if (modelName.includes("deepseek-r1") || modelName.includes("qwq")) {
      requestBody.options.temperature = 0.1; // 推理模型使用低温度
      requestBody.options.num_ctx = 16384; // 推理模型需要更长上下文
    }
    
    // 发送 API 请求
    const response = await fetch(`${client.endpoint}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    
    // 处理工具调用响应
    let toolCalls = null;
    if (result.message.tool_calls && result.message.tool_calls.length > 0) {
      toolCalls = result.message.tool_calls.map((call, index) => ({
        id: `call_${Date.now()}_${index}`,
        type: "function",
        function: {
          name: call.function.name,
          arguments: JSON.stringify(call.function.arguments || {})
        }
      }));
    }
    
    // 将 Ollama 响应转换为统一格式
    return {
      status: "200",
      body: {
        choices: [{
          message: {
            role: "assistant",
            content: result.message.content || "",
            tool_calls: toolCalls
          },
          finish_reason: toolCalls ? "tool_calls" : "stop"
        }],
        usage: {
          prompt_tokens: result.prompt_eval_count || 0,
          completion_tokens: result.eval_count || 0,
          total_tokens: (result.prompt_eval_count || 0) + (result.eval_count || 0)
        },
        model: result.model || modelName
      }
    };
  } catch (error) {
    logger.error(`Ollama请求失败: ${error.message}`);
    return {
      status: "400",
      body: {
        error: {
          message: error.message,
          type: "Ollama API Error",
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
