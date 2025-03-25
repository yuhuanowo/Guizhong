# 歸終API文檔（繁體中文版）

本文檔提供了關於歸終Discord機器人API的詳細信息，供開發者理解、使用和擴展歸終的功能。

## 目錄
- [介紹](#介紹)
- [核心模塊](#核心模塊)
- [事件系統](#事件系統)
- [命令系統](#命令系統)
- [音樂系統API](#音樂系統api)
- [AI集成API](#ai集成api)
- [數據存儲API](#數據存儲api)
- [抽獎系統API](#抽獎系統api)
- [開發擴展模塊](#開發擴展模塊)
- [貢獻代碼](#貢獻代碼)

## 介紹

歸終是基於[discord.js](https://discord.js.org/)庫開發的Discord機器人，支持多種功能，包括音樂播放、AI聊天、抽獎系統等。本API文檔旨在幫助開發者理解歸終的內部結構，以便於擴展和改進機器人功能。

## 核心模塊

歸終的核心架構包括以下模塊：

### src/bot.js
主程序入口，負責初始化客戶端和加載所有模塊。

### src/config.js
配置管理器，負責從config.yml文件加載配置信息。

### src/utils/logger.js
日誌管理系統，提供統一的日誌記錄接口。

### src/functions/
包含三個核心功能處理器：
- `handleEvents.js` - 事件處理系統
- `handleCommands.js` - 命令處理系統
- `handleButtons.js` - 按鈕交互處理系統

## 事件系統

歸終使用事件驅動架構，在`src/events/`目錄下組織各種事件處理程序。

### 註冊新事件
要添加新的事件處理，請在`src/events/`相應子目錄下創建新文件，遵循以下格式：

```javascript
module.exports = {
    name: "事件名稱", // Discord.js事件名稱，如messageCreate
    once: false,    // 是否只執行一次
    async execute(...args) {
        // 事件處理邏輯
    }
};
```

## 命令系統

命令定義在`src/commands/`目錄下，按功能分類組織。

### 添加新命令
要添加新命令，在適當的子目錄下創建新文件，遵循以下格式：

```javascript
const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("命令名稱")
        .setDescription("命令描述")
        .addStringOption(option => 
            option.setName("參數名")
                .setDescription("參數描述")
                .setRequired(true/false)),
    
    async execute(interaction) {
        // 命令執行邏輯
    }
};
```

## 音樂系統API

歸終使用`discord-player`庫處理音樂播放功能，主要API位於`src/commands/Player/`目錄下。

### 主要方法

#### 播放音樂
```javascript
const { useMainPlayer } = require("discord-player");
const player = useMainPlayer();

// 搜索和播放音樂
const searchResult = await player.search(query);
const queue = player.nodes.create(guild);
await queue.node.play(searchResult.tracks[0]);
```

#### 控制播放
```javascript
// 暫停
queue.node.pause();

// 恢復
queue.node.resume();

// 跳過
queue.node.skip();

// 停止播放
queue.node.stop();
```

## AI集成API

AI功能主要位於`src/commands/LLM/`和`src/commands/general/`目錄下，使用各種AI API服務。

### 使用API示例

```javascript
// OpenAI集成示例
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
    apiKey: config.openaiApiKey,
});
const openai = new OpenAIApi(configuration);

// 發送請求到OpenAI
const response = await openai.createCompletion({
    model: selectedModel,
    messages: messages,
});
```

## 數據存儲API

歸終使用JSON文件和SQLite數據庫存儲數據。

### JSON存儲
```javascript
const fs = require("fs");

// 讀取數據
function loadData(filePath) {
    try {
        const data = fs.readFileSync(filePath, "utf8");
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error loading data: ${error}`);
        return {};
    }
}

// 保存數據
function saveData(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data));
    } catch (error) {
        console.error(`Error saving data: ${error}`);
    }
}
```

### SQLite數據庫
```javascript
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./chatlog.db');

// 查詢數據
db.all("SELECT * FROM chat_log WHERE user_id = ?", [userId], (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    // 處理查詢結果
});

// 插入數據
db.run(
    "INSERT INTO chat_log (user_id, model, prompt, reply, timestamp) VALUES (?, ?, ?, ?, ?)",
    [userId, model, prompt, reply, timestamp]
);
```

## 抽獎系統API

抽獎系統位於`src/commands/lottery/`目錄下，提供了一系列用於管理抽獎活動的功能。

### 主要功能

#### 購買彩票
```javascript
// 檢查用戶餘額
if (money[userId] < ticketPrice) {
    return "餘額不足";
}

// 扣除費用
money[userId] -= ticketPrice;

// 分配彩票號碼
if (!tickets[userId]) {
    tickets[userId] = [];
}
tickets[userId].push(generatedTicketNumber);

// 保存數據
fs.writeFileSync("src/JSON/tickets.json", JSON.stringify(tickets));
fs.writeFileSync("src/JSON/money.json", JSON.stringify(money));
```

#### 抽獎
```javascript
// 構建彩票池
const ticketPool = [];
for (const userId in tickets) {
    tickets[userId].forEach(ticket => {
        ticketPool.push({ userId, ticket });
    });
}

// 隨機抽取獲獎者
const winners = [];
for (let i = 0; i < prizeCount; i++) {
    if (ticketPool.length === 0) break;
    
    const winnerIndex = Math.floor(Math.random() * ticketPool.length);
    const winner = ticketPool.splice(winnerIndex, 1)[0];
    winners.push(winner);
}
```

## 開發擴展模塊

歸終設計為模塊化系統，可以通過以下步驟添加新功能：

1. 在適當的目錄下創建新的命令或事件處理文件
2. 遵循現有的文件格式和約定
3. 重啟機器人以加載新模塊

### 示例：創建自定義命令

```javascript
// src/commands/Custom/hello.js
const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("hello")
        .setDescription("回复一個自定義問候"),
    
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle("問候")
            .setDescription(`你好，${interaction.user.username}!`)
            .setColor("#00ff00");
            
        await interaction.reply({ embeds: [embed] });
    }
};
```

## 貢獻代碼

如果您想為歸終貢獻代碼，請參閱[貢獻指南](../../CONTRIBUTING_ZH-TW.md)。

---

本文檔會隨著歸終的發展不斷更新。如有任何問題或建議，請提交GitHub Issue或加入我們的Discord服務器討論。