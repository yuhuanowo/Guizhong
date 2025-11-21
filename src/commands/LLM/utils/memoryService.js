const mongoose = require("mongoose");
const logger = require("../../../utils/logger.js");
const config = require("../../../config.js");
const { AzureKeyCredential } = require("@azure/core-auth");
const ModelClient = require("@azure-rest/ai-inference").default;

// MongoDB模型定义
const chatLogSchema = new mongoose.Schema({
  user_id: String,
  model: String,
  prompt: String,
  reply: String,
  timestamp: { type: Date, default: Date.now },
  interaction_id: String,
  parent_id: String,
  // Extended Metadata
  user_info: {
    username: String,
    avatar_url: String,
    display_name: String
  },
  guild_info: {
    name: String,
    id: String,
    icon_url: String
  },
  usage: {
    prompt_tokens: Number,
    completion_tokens: Number,
    total_tokens: Number
  },
  options: {
    enable_search: Boolean,
    enable_system_prompt: Boolean
  },
  processing_time_ms: Number
});

const MemorySchema = new mongoose.Schema({
  user_id: String,
  memory: String,
  lastUpdate: { type: Date, default: Date.now }
});

// 确保模型只被创建一次
const ChatLog = mongoose.models.ChatLog || mongoose.model("ChatLog", chatLogSchema);
const Memory = mongoose.models.Memory || mongoose.model("Memory", MemorySchema);

/**
 * 保存聊天记录到MongoDB
 * @param {string} user_id 用户ID
 * @param {string} model 使用的模型
 * @param {string} prompt 用户提问
 * @param {string} reply AI回复
 * @param {string} interaction_id 交互ID
 * @param {string} parent_id 父交互ID (可选)
 * @param {Object} extraData 额外数据 (userInfo, guildInfo, usage, processingTime)
 */
async function saveChatLogToMongo(user_id, model, prompt, reply, interaction_id, parent_id = null, extraData = {}) {
  const chatLog = new ChatLog({ 
    user_id, 
    model, 
    prompt, 
    reply, 
    interaction_id,
    parent_id,
    user_info: extraData.userInfo,
    guild_info: extraData.guildInfo,
    usage: extraData.usage,
    options: extraData.options,
    processing_time_ms: extraData.processingTime
  });
  await chatLog.save();
}

/**
 * 更新用户的长期记忆
 * @param {string} user_id 用户ID
 * @param {string} newPrompt 新的提示
 */
async function updateUserMemory(user_id, newPrompt) {
  // 负载平衡 - 两个token随机轮流使用
  const memtoken = config.githubToken 
  const dbclient = new ModelClient(
    "https://models.inference.ai.azure.com",
    new AzureKeyCredential(memtoken),
    { apiVersion: "2025-04-01-preview" }
  );

  try {
    logger.info(`Updating memory for user ${user_id}`);
    // 获取最近4次对话记录
    const recentLogs = await ChatLog.find({ user_id }).sort({ timestamp: -1 }).limit(4);
    const recentConversations = recentLogs.map(log => ({
      prompt: log.prompt,
      reply: log.reply
    }));

    // 获取用户的长期记忆
    const memory = await Memory.findOne({ user_id });
    const memoryText = memory ? memory.memory : "";

    // 构建LLaMA输入prompt
    const llamaprompt = `
    以下是過去建立的長期記憶資訊，請務必將此匯入新的記憶中，但不要再次提及已有內容，以免重複記憶，但更不要將這些內容忘記。
    \n${memoryText}
    \n\n
    以下是使用者近期的對話提問記錄：
    \n${recentConversations.map((conversation, index) => `對話 ${index + 2}：
    \n提問：${conversation.prompt}`).join("\n")}
    \n最新提問：${newPrompt}
    \n\n請根據這些提問，更新使用者的長期記憶，意旨複製上方舊的長期記憶並增加內容，抓取使用者的請求與要求，並且記住使用者隱私個資，推論出使用者的習慣與秘密。
    \n請確保你的回應簡潔但不隨意或殘缺，不回答變化、增加減少，不超過 500 字，並且專注於長期有用的信息，注重於你"以後、全都"等大範圍指令，並收集大量資訊，而不是短期少量的對話細節。最後，請完成以下個資表單，但不要填入額外訊息，避免污染數據庫。請用條列方式提供以下資訊：
    \n\n1. **語氣與風格**（如正式/非正式、幽默/嚴肅、直接/委婉）
    \n2. **常見關注主題**（如：科技、遊戲、小說、AI、大型語言模型）
    \n3. **信息需求類型**（如簡要回答/詳細解釋/專業推薦/技術指導）
    \n4. **互動模式**（如傾向問開放性問題/下明確指令/偏好對話式互動）
    \n5. **其他值得記住的個人特徵**（如喜歡具體舉例、喜歡條列式回答、特定詞彙風格）
    \n基本資訊: {
      "名稱": "",
      "性別": "",
      "年齡": "",
      "語言": [],
      "所在地": "",
      "聯絡方式": {
        "Email": "",
        "社交媒體": {
          "GitHub": "",
          "Twitter": "",
          "LinkedIn": "",
          "其他": []
        }
      }
    },
    興趣與愛好: {
      "遊戲": [],
      "音樂": [],
      "電影與影視": [],
      "閱讀": [],
      "運動與健身": [],
      "攝影": {
        "設備": [],
        "風格偏好": []
      },
      "旅行": {
        "目的地": [],
        "旅行風格": ""
      },
      "科技與科學": [],
      "藝術與設計": []
    },
    學習與技能: {
      "學習語言": [],
      "專業領域": [],
      "編程與技術": {
        "程式語言": [],
        "框架與工具": [],
        "數據處理": [],
        "機器學習與 AI": [],
        "開發環境": ""
      },
      "學習目標": []
    },
    職業與工作: {
      "職業": "",
      "公司": "",
      "產業": "",
      "工作內容": "",
      "技能": [],
      "過去項目": [],
      "職業目標": ""
    },
    個人風格: {
      "性格特質": [],
      "MBTI": "",
      "溝通方式": "",
      "決策風格": "",
      "喜歡的內容呈現方式": ""
    },
    設備與使用環境: {
      "電腦": {
        "品牌": "",
        "型號": "",
        "作業系統": "",
        "主要用途": ""
      },
      "手機": {
        "品牌": "",
        "型號": "",
        "作業系統": ""
      },
      "其他設備": []
    },
    社交與心理: {
      "社交偏好": "",
      "心理特徵": [],
      "價值觀": [],
      "動機": [],
      "壓力與擔憂": []
    },
    使用 AI 需求: {
      "資訊需求類型": "",
      "互動模式": "",
      "回應風格偏好": "",
      "使用頻率": "",
      "主要用途": []
    }
    `;
    
    // 向Azure LLaMA模型发送请求
    const response = await dbclient.path("/chat/completions").post({
      body: {
        messages: [
          {
            role: "system",
            content: "你是一個對話記憶整理助手，專門負責從過去的對話記錄中提取使用者的長期交流習慣。你的任務是根據提供的舊對話與新對話，總結出應該記住的使用者特徵，並忽略短期、不重要的信息。請確保你的總結簡明扼要，只關注使用者的習慣和長期特徵，而不是具體的對話內容。"
          },
          { role: "user", content: llamaprompt },
        ],
        model: "Meta-Llama-3.1-8B-Instruct",
      }
    });
  
    // 检查API响应
    if (!response || !response.body || !response.body.choices || response.body.choices.length === 0) {
      throw new Error("LLaMA API returned an unexpected response structure");
    }
  
    // 解析LLaMA的记忆摘要
    const llamaSummary = response.body.choices[0].message.content;
    const memoryUpdate = llamaSummary.replace(/<[^>]*>/g, "").trim();
    logger.info(`Memory update for user ${user_id}: ${memoryUpdate}`);
  
    // 更新用户的长期记忆并记录最后更新时间
    await Memory.findOneAndUpdate(
      { user_id },
      { memory: memoryUpdate, lastUpdate: new Date() },
      { upsert: true }
    );
    
  } catch (error) {
    logger.error("Memory update error:", error);
    logger.error("Error details:", error && error.stack ? error.stack : JSON.stringify(error));
  }
}

/**
 * 根据历史ID获取历史对话
 * @param {string} historyId 历史对话ID
 * @param {string} userId 用户ID
 * @returns {Promise<{prompt: string, reply: string}|null>} 历史对话
 */
async function getHistoryById(historyId, userId) {
  try {
    const mongoRow = await ChatLog.findOne({ interaction_id: String(historyId), user_id: userId });
    if (mongoRow) {
      return {
        prompt: mongoRow.prompt,
        reply: mongoRow.reply
      };
    }
    return null;
  } catch (error) {
    logger.error(`Error retrieving history by ID ${historyId}:`, error);
    return null;
  }
}

/**
 * 获取完整的对话历史链
 * @param {string} historyId 起始历史ID (最新的)
 * @param {string} userId 用户ID
 * @param {number} limit 限制回溯深度
 * @returns {Promise<Array<{role: string, content: string}>>} 消息数组
 */
async function getConversationHistory(historyId, userId, limit = 20) {
  try {
    let messages = [];
    let currentId = historyId;
    let depth = 0;

    while (currentId && depth < limit) {
      const log = await ChatLog.findOne({ interaction_id: String(currentId), user_id: userId });
      if (!log) break;

      // Prepend to messages (since we are going backwards)
      messages.unshift({ role: "assistant", content: log.reply });
      messages.unshift({ role: "user", content: log.prompt });

      currentId = log.parent_id;
      depth++;
    }
    return messages;
  } catch (error) {
    logger.error(`Error retrieving conversation history starting from ${historyId}:`, error);
    return [];
  }
}

module.exports = {
  saveChatLogToMongo,
  updateUserMemory,
  getHistoryById,
  getConversationHistory,
  ChatLog,
  Memory
};