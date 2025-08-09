/**
 * Yunmo Provider
 * 处理所有Yunmo API调用 (自定义OpenAI API格式)
 */
const fetch = require("node-fetch");
const logger = require("../../../../utils/logger.js");

/**
 * 创建Yunmo客户端
 * @param {string} apiKey API密钥（可选）
 * @param {string} apiEndpoint API端点
 * @returns {Object} Yunmo客户端配置
 */
function createClient(apiKey, apiEndpoint) {
  return {
    apiKey,
    baseUrl: "http://localhost:8998/v1" // 默认使用本地8000端口
  };
}


/**
 * 处理用户消息格式
 * @param {Object} userMessage 用户消息对象
 * @param {string} modelName 模型名称
 * @returns {Object} 格式化后的用户消息
 */
function formatUserMessage(userMessage, modelName) {
  // 对于Yunmo模型，返回消息数组，保证可迭代性
  // 如果需要处理图片等多模态输入，可以在这里添加逻辑
  return Array.isArray(userMessage) ? userMessage : [userMessage];
}

/**
 * 发送Yunmo请求
 * @param {Array} messages 消息数组
 * @param {string} modelName 模型名称
 * @param {Array} tools 工具数组（可选）
 * @param {Object} client Yunmo客户端
 * @returns {Promise<Object>} 响应结果
 */
async function sendRequest(messages, modelName, tools, client) {
  try {
    // 准备请求正文
    const requestBody = {
      model: modelName,
      messages: messages,
      temperature: 0.7,
      max_tokens: 4096,
      stream: false
    };
    // 发送API请求
    const response = await fetch(`${client.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(client.apiKey ? { "Authorization": `Bearer ${client.apiKey}` } : {})
      },
      body: JSON.stringify(requestBody)
    });
    let body;
    let status = response.status.toString();
    try {
      body = await response.json();
    } catch (e) {
      body = { error: await response.text() };
    }
    // 若非 200，补充 error 字段
    if (!response.ok) {
      if (!body.error) body.error = `Yunmo API错误 (${status}): ${typeof body === 'string' ? body : JSON.stringify(body)}`;
    }
    return { status, body };
  } catch (error) {
    logger.error(`Yunmo API请求失败: ${error.message}`);
    return { status: "500", body: { error: `Yunmo API请求失败: ${error.message}` } };
  }
}

/**
 * 流式发送Yunmo请求
 * @param {Array} messages 消息数组
 * @param {string} modelName 模型名称
 * @param {Array} tools 工具数组（可选）
 * @param {Object} client Yunmo客户端
 * @param {function} onData 数据回调函数
 * @returns {Promise<Object>} 响应结果
 */
async function sendStreamRequest(messages, modelName, tools, client, onData) {
  try {
    // 准备请求正文
    const requestBody = {
      model: modelName,
      messages: messages,
      temperature: 0.7,
      max_tokens: 1024,
      stream: false
    };
    
    // 发送API请求
    const response = await fetch(`${client.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(client.apiKey ? { "Authorization": `Bearer ${client.apiKey}` } : {})
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Yunmo API错误 (${response.status}): ${errorText}`);
    }
    
    // 处理流式响应
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    
    let finalCompletion = null;
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      buffer += chunk;
      
      // 处理流式数据中的每个完整消息
      let lines = buffer.split("\n");
      buffer = lines.pop() || "";
      
      for (const line of lines) {
        if (line.trim() === "") continue;
        if (line.trim() === "data: [DONE]") continue;
        
        try {
          if (line.startsWith("data: ")) {
            const jsonData = JSON.parse(line.slice(6));
            
            // 处理每个数据块
            if (jsonData.choices && jsonData.choices.length > 0) {
              const delta = jsonData.choices[0].delta;
              
              if (delta && delta.content) {
                // 回调每个内容块
                onData({
                  text: delta.content,
                  done: false
                });
              }
              
              // 记录完整响应
              if (!finalCompletion) {
                finalCompletion = {
                  id: jsonData.id,
                  object: jsonData.object,
                  created: jsonData.created,
                  model: jsonData.model,
                  choices: [{
                    index: 0,
                    message: { role: "assistant", content: "" }
                  }]
                };
              }
              
              if (delta && delta.content) {
                finalCompletion.choices[0].message.content += delta.content;
              }
            }
          }
        } catch (err) {
          logger.error(`处理Yunmo流式响应出错: ${err.message}`);
        }
      }
    }
    
    // 通知完成
    onData({ text: "", done: true });
    
    return finalCompletion || {
      id: `yunmo-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: modelName,
      choices: [{
        index: 0,
        message: { role: "assistant", content: "" }
      }]
    };
  } catch (error) {
    logger.error(`Yunmo流式API请求失败: ${error.message}`);
    throw new Error(`Yunmo流式API请求失败: ${error.message}`);
  }
}

module.exports = {
  createClient,
  formatUserMessage,
  sendRequest,
  sendStreamRequest
};
