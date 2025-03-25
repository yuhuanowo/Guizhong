// 假设使用 sqlite
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./chatlog.db");

// 初始化数据库表（新增 prompt、reply 列）
db.run(`
  CREATE TABLE IF NOT EXISTS chat_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    model TEXT,
    prompt TEXT,
    reply TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { EmbedBuilder } = require("discord.js");
const config = require("../../config.js");
const fs = require("fs");
const logger = require("../../utils/logger.js");
const OpenAI = require("openai");
const path = "./src/JSON/chatgptusage.json";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("aichat")
    .setDescription("與AI進行對話")
    .addStringOption((option) =>
      option
        .setName("model")
        .setDescription("選擇模型")
        .setRequired(true)
        .addChoices(
          { name: "gpt4o", value: "gpt-4o" },
          { name: "gpt4o-mini", value: "gpt-4o-mini" },
          { name: "o1", value: "o1" },
          { name: "o1-mini", value: "o1-mini" }
        )
    )
    .addStringOption((option) =>
      option.setName("text").setDescription("輸入內容").setRequired(true)
    )

    .addStringOption((option) =>
      option
        .setName("history")
        .setDescription("選擇過去的對話紀錄")
        .setAutocomplete(true)
    )
    
    .addAttachmentOption((option) =>
      option.setName("image").setDescription("上傳圖片")
    )
    .addAttachmentOption((option) =>
      option.setName("audio").setDescription("上傳音訊")
    ),

  async autocompleteRun(interaction) {
    try {
      const focusedValue = interaction.options.getFocused();
  
      // 辅助函数：將 timestamp 轉成「幾天/幾小時/幾分鐘前」字串
      function formatRelativeTime(timestamp) {
        // 現在時間 (伺服器時間 因為timestamp是伺服器時間)
        const now = new Date().getTime();
        const recordTime = new Date(timestamp).getTime();
        const diffMs = now - recordTime;
  
        const diffMinutes = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);
  
        if (diffDays > 0) {
          return `${diffDays}天前`;
        } else if (diffHours > 0) {
          return `${diffHours}小時前`;
        } else if (diffMinutes > 0) {
          return `${diffMinutes}分鐘前`;
        }
        return "剛剛";
      }
  
      // 数据库查询
      const rows = await new Promise((resolve, reject) => {
        db.all(
          "SELECT id, user_id, model, prompt, reply, timestamp \
           FROM chat_log \
           WHERE user_id = ? \
           AND prompt LIKE ? \
           ORDER BY timestamp DESC \
           LIMIT 10",
          [interaction.user.id, `%${focusedValue}%`],
          (err, rows) => {
            if (err) {
              console.error("數據庫查詢錯誤:", err);
              reject(err);
              return;
            }
            resolve(rows || []);
          }
        );
      });
  
      // 格式化選項
      const choices = rows.map(row => {
        const displayPrompt = row.prompt.length > 50
          ? row.prompt.slice(0, 47) + "..."
          : row.prompt;
  
        const timeAgo = formatRelativeTime(row.timestamp);
  
        return {
          name: `💭 ${displayPrompt} (${timeAgo})`,
          value: row.id.toString()
        };
      });
  
      // console.log("autocomplete choices:", choices);
  
      // 返回結果（確保不超過 25 個選項）
      await interaction.respond(choices.slice(0, 25));
  
    } catch (error) {
      console.error("Autocomplete 錯誤:", error);
      await interaction.respond([]);
    }
  },

  async execute(interaction) {
    const selectedModel = interaction.options.getString("model");
    const historyId = interaction.options.getString("history");
    const prompt = interaction.options.getString("text") || "";
    const image = interaction.options.getAttachment("image");
    const audio = interaction.options.getAttachment("audio");

    // 生成中...
    const reply = new EmbedBuilder().setTitle("正在生成中...").setColor("#3399ff");
    await interaction.reply({ embeds: [reply] });

    // 用量限制检查
    const usageLimits = { "gpt-4o": 10, "gpt-4o-mini": 30, "o1": 4, "o1-mini": 4 };
    let userUsage = JSON.parse(fs.readFileSync(path));
    const currentDate = new Date().toISOString().split("T")[0];
    if (!userUsage.date || userUsage.date !== currentDate) userUsage = { date: currentDate };
    if (!userUsage[interaction.user.id]) userUsage[interaction.user.id] = {};
    if (!userUsage[interaction.user.id][selectedModel]) userUsage[interaction.user.id][selectedModel] = 0;
    userUsage[interaction.user.id][selectedModel]++;
    fs.writeFileSync(path, JSON.stringify(userUsage, null, 2));
    if (userUsage[interaction.user.id][selectedModel] > usageLimits[selectedModel]) {
      const embed = new EmbedBuilder()
        .setTitle("AI Text Generation")
        .setDescription("生成失敗 - 本日使用次數已達上限")
        .setColor("#ff0000");
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // 初始化 client
    const client = new OpenAI({
      baseURL: "https://models.inference.ai.azure.com",
      apiKey: config.githubToken,
    });

    // 取回之前對話
    let messages = [];
    if (historyId) {
      const row = await new Promise((resolve) => {
        db.get(
          "SELECT prompt, reply FROM chat_log WHERE id = ? AND user_id = ?",
          [historyId, interaction.user.id],
          (err, result) => {
            if (err || !result) return resolve(null);
            resolve(result);
          }
        );
      });
      if (row) {
        // 用於讓AI知道之前的上下文
        messages.push({ role: "user", content: row.prompt });
        messages.push({ role: "assistant", content: row.reply });
      }
    }

    // 新的 prompt
    let userMessage = [{ role: "user", content: prompt }];
    if (image && selectedModel !== "o1-mini") {
      userMessage = [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: image.url } },
          ],
        },
      ];
    }
    if (audio && selectedModel !== "o1-mini") {
      userMessage = [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "audio", audio: { url: audio.url } },
          ],
        },
      ];
    }
    messages = [...messages, ...userMessage];

    // 系統提示
    if (selectedModel === "gpt-4o" || selectedModel === "gpt-4o-mini") {
      messages.unshift({
        role: "system",
        content: "你是一個名為「歸終」的 Discord 機器人...",
      });
    } else if (selectedModel === "o1") {
      messages.unshift({
        role: "developer",
        content: "你是一個名為「歸終」的 Discord 機器人...",
      });
    }

    try {
      // 生成回复
      const response = await client.chat.completions.create({
        model: selectedModel,
        messages: messages,
      });
      const outputText = response.choices[0].message.content || "";

      logger.info(`AI文本生成: ${outputText} \t 使用者: ${interaction.user.tag}`);

      // 将用户问题与回复都存储
      db.run(
        "INSERT INTO chat_log (user_id, model, prompt, reply ,timestamp) VALUES (?, ?, ?, ?, ?)",
        [interaction.user.id, selectedModel, prompt, outputText , new Date().toISOString()]
      );

      // Embed
      const embed = new EmbedBuilder()
        .setTitle("AI Text Generation")
        .setDescription(outputText)
        .setColor("#00ff00")
        .setFooter({
          text: `Powered by ${selectedModel} | 今日使用次數：${userUsage[interaction.user.id][selectedModel]}/${usageLimits[selectedModel]}`,
        })
        .setTimestamp();
      if (image && selectedModel !== "o1-mini") embed.setImage(image.url);

      // 查看完整對話按鈕
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("viewHistory")
          .setLabel("查看歷史對話")
          .setStyle(ButtonStyle.Primary)
      );

      await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (err) {
      console.error(err);
      const failEmbed = new EmbedBuilder()
        .setTitle("AI Text Generation")
        .setDescription("生成失敗 - 請稍後再試")
        .setColor("#ff0000");
      await interaction.editReply({ embeds: [failEmbed] });
    }
  },
};

// 在其他事件監聽裡攔截 customId="viewHistory" 的按鈕回覆，用同個 id 從 DB 取出所有紀錄
// 做完整展示或私訊，根據需求擴展。