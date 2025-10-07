/**
 * GitHub Model Provider
 * 处理所有GitHub Model API调用
 */
const { AzureKeyCredential } = require("@azure/core-auth");
const ModelClient = require("@azure-rest/ai-inference").default;
const fetch = require("node-fetch");

/**
 * 创建GitHub Model客户端
 * @param {string} token API令牌
 * @returns {Object} GitHub Model客户端
 */
function createClient(token) {
  return new ModelClient(
    "https://models.inference.ai.azure.com",
    new AzureKeyCredential(token),
    { apiVersion: "2025-04-01-preview" }
  );
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
  
  // 根据模型特性选择合适的角色
  let role = "system";
  
  // 推理模型使用 developer 角色
  if (["o1-preview", "o1-mini", "o3-mini", "o1", "o4-mini", "o3"].includes(modelName)) {
    role = "developer";
  }
  // DeepSeek 等特殊模型使用 assistant 角色
  else if (["DeepSeek-R1", "DeepSeek-V3-0324", "DeepSeek-R1-0528", "ai21-jamba-1.5-large", "ai21-jamba-1.5-mini"].includes(modelName)) {
    role = "assistant";  
  }
  // 其他模型使用标准 system 角色
  
  return { role, content: basePrompt };
}

/**
 * 处理用户消息格式
 * @param {string} prompt 用户提示
 * @param {Object} image 图片附件
 * @param {Object} audio 音频附件
 * @param {string} modelName 模型名称
 * @returns {Promise<Array>} 格式化后的用户消息
 */
async function formatUserMessage(prompt, image, audio, modelName) {
  let userMessage = [{ role: "user", content: prompt }];
  
  // 定义不支持多模态的模型列表
  const noMultimodalModels = [
    "o1-preview", "o1-mini", "o3-mini", "o1", // 推理模型
    "cohere-command-r", "cohere-command-r-plus", // Cohere 文本模型
    "ai21-jamba-1.5-mini", // AI21 小模型
    "DeepSeek-R1", "Cohere-command-r-08-2024", "Ministral-3B", // Legacy 模型
  ];
  
  // 添加图片处理 - 支持多模态的模型
  if (image && !noMultimodalModels.includes(modelName)) {
    try {
      const imageBase64 = await fetch(image.url)
        .then(res => res.buffer())
        .then(buffer => buffer.toString("base64"));
      userMessage = [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { 
              type: "image_url", 
              image_url: { 
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: "high" // 使用高质量图像分析
              } 
            }
          ]
        }
      ];
    } catch (error) {
      console.warn(`图片处理失败: ${error.message}`);
    }
  }

  // 添加音频处理 - 仅 GPT-4o 系列等高级模型支持
  const audioSupportedModels = [
    "gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "o3", "o4-mini","gpt-5", "gpt-5-chat", "gpt-5-mini", "gpt-5-nano",
    "meta-llama-3.3-70b-instruct", "meta-llama-3.1-405b-instruct" // 部分 Llama 模型
  ];
  
  if (audio && audioSupportedModels.includes(modelName)) {
    try {
      const audioBase64 = await fetch(audio.url)
        .then(res => res.buffer())
        .then(buffer => buffer.toString("base64"));
      
      // 如果同时有图片，需要合并内容
      if (image && !noMultimodalModels.includes(modelName)) {
        userMessage[0].content.push({
          type: "audio", 
          audio: { 
            url: `data:audio/wav;base64,${audioBase64}`,
            format: "wav"
          }
        });
      } else {
        userMessage = [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { 
                type: "audio", 
                audio: { 
                  url: `data:audio/wav;base64,${audioBase64}`,
                  format: "wav"
                }
              }
            ]
          }
        ];
      }
    } catch (error) {
      console.warn(`音频处理失败: ${error.message}`);
    }
  }
  
  return userMessage;
}

/**
 * 发送GitHub Model请求
 * @param {Array} messages 消息数组
 * @param {string} modelName 模型名称
 * @param {Array} tools 工具数组
 * @param {Object} client GitHub Model客户端
 * @returns {Promise<Object>} 响应结果
 */
async function sendRequest(messages, modelName, tools, client) {
  // 推理模型不支持工具调用
  const reasoningModels = [
    "o1-preview", "o1-mini", "o3-mini", "o1", "o4-mini", "o3","DeepSeek-R1","DeepSeek-V3-0324", "DeepSeek-R1-0528"
  ];
  
  // 判断是否为gpt5、gpt-4.1、gpt-4o相关模型
  const gpt5Models = ["gpt-5", "gpt-5-chat", "gpt-5-mini", "gpt-5-nano"];
  const gpt4oModels = ["gpt-4o", "gpt-4o-mini"];
  const gpt41Models = [ "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano"];

  // 构建请求体，默认参数
  const requestBody = {
    messages: messages,
    model: modelName,
    stream: false, // 禁用流式响应以确保完整性
  };

  // gpt-5系列模型 （not gpt-5-chat）
  if (gpt5Models.some(m => modelName.startsWith(m)) && modelName !== "gpt-5-chat") {
    requestBody.max_completion_tokens = 128000;
  }
  else if (modelName === "gpt-5-chat") {
    requestBody.max_completion_tokens = 16384;
  }
  // gpt-4o系列模型
  else if (gpt4oModels.some(m => modelName.startsWith(m))) {
    requestBody.max_tokens = 4096;
    requestBody.temperature = 0.7;
  }
  // gpt-4.1系列模型
  else if (gpt41Models.some(m => modelName.startsWith(m))) {
    requestBody.max_tokens = 32768;
    requestBody.temperature = 0.7;
  }
  // openai o系列模型
  else if (["o1-preview", "o1-mini", "o3-mini", "o1", "o3"].includes(modelName)) {
    requestBody.max_completion_tokens = 100000; // 推理模型需要更多 token
  }
  // openai o4-mini 模型
  else if (["o4-mini"].includes(modelName)) {
    requestBody.max_completion_tokens = 16384;
  }
  // DeepSeek 等特殊模型
  else if (["DeepSeek-R1", "DeepSeek-V3-0324", "DeepSeek-R1-0528"].includes(modelName)) {
    requestBody.max_tokens = 4096;
  }
  // 其他模型
  else {
    requestBody.max_tokens = 4096;
    requestBody.temperature = 0.7;
  }

  // 只有支持工具调用的模型才添加 tools 参数
  if (!reasoningModels.includes(modelName) && tools && tools.length > 0) {
    requestBody.tools = tools;
    requestBody.tool_choice = "auto"; // 自动选择是否使用工具
  }
  
  
  // 对于代码生成模型，优化参数
  if (modelName.includes("phi") || modelName.includes("llama")) {
    requestBody.temperature = 0.3;
  }
  
  try {
    return await client.path("/chat/completions").post({
      body: requestBody
    });
  } catch (error) {
    console.error(`GitHub Model API 请求失败: ${error.message}`);
    throw error;
  }
}

module.exports = {
  createClient,
  getSystemPrompt,
  formatUserMessage,
  sendRequest
};
