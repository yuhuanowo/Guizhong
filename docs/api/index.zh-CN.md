# 歸終API文档（简体中文版）

本文档提供了关于歸終Discord机器人API的详细信息，供开发者理解、使用和扩展歸終的功能。

## 目录
- [介绍](#介绍)
- [核心模块](#核心模块)
- [事件系统](#事件系统)
- [命令系统](#命令系统)
- [音乐系统API](#音乐系统api)
- [AI集成API](#ai集成api)
- [数据存储API](#数据存储api)
- [抽奖系统API](#抽奖系统api)
- [开发扩展模块](#开发扩展模块)
- [贡献代码](#贡献代码)

## 介绍

歸終是基于[discord.js](https://discord.js.org/)库开发的Discord机器人，支持多种功能，包括音乐播放、AI聊天、抽奖系统等。本API文档旨在帮助开发者理解歸終的内部结构，以便于扩展和改进机器人功能。

## 核心模块

歸終的核心架构包括以下模块：

### src/bot.js
主程序入口，负责初始化客户端和加载所有模块。

### src/config.js
配置管理器，负责从config.yml文件加载配置信息。

### src/utils/logger.js
日志管理系统，提供统一的日志记录接口。

### src/functions/
包含三个核心功能处理器：
- `handleEvents.js` - 事件处理系统
- `handleCommands.js` - 命令处理系统
- `handleButtons.js` - 按钮交互处理系统

## 事件系统

歸終使用事件驱动架构，在`src/events/`目录下组织各种事件处理程序。

### 注册新事件
要添加新的事件处理，请在`src/events/`相应子目录下创建新文件，遵循以下格式：

```javascript
module.exports = {
    name: "事件名称", // Discord.js事件名称，如messageCreate
    once: false,    // 是否只执行一次
    async execute(...args) {
        // 事件处理逻辑
    }
};
```

## 命令系统

命令定义在`src/commands/`目录下，按功能分类组织。

### 添加新命令
要添加新命令，在适当的子目录下创建新文件，遵循以下格式：

```javascript
const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("命令名称")
        .setDescription("命令描述")
        .addStringOption(option => 
            option.setName("参数名")
                .setDescription("参数描述")
                .setRequired(true/false)),
    
    async execute(interaction) {
        // 命令执行逻辑
    }
};
```

## 音乐系统API

歸終使用`discord-player`库处理音乐播放功能，主要API位于`src/commands/Player/`目录下。

### 主要方法

#### 播放音乐
```javascript
const { useMainPlayer } = require("discord-player");
const player = useMainPlayer();

// 搜索和播放音乐
const searchResult = await player.search(query);
const queue = player.nodes.create(guild);
await queue.node.play(searchResult.tracks[0]);
```

#### 控制播放
```javascript
// 暂停
queue.node.pause();

// 恢复
queue.node.resume();

// 跳过
queue.node.skip();

// 停止播放
queue.node.stop();
```

## AI集成API

AI功能主要位于`src/commands/LLM/`和`src/commands/general/`目录下，使用各种AI API服务。

### 使用API示例

```javascript
// OpenAI集成示例
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
    apiKey: config.openaiApiKey,
});
const openai = new OpenAIApi(configuration);

// 发送请求到OpenAI
const response = await openai.createCompletion({
    model: selectedModel,
    messages: messages,
});
```

## 数据存储API

歸終使用JSON文件和SQLite数据库存储数据。

### JSON存储
```javascript
const fs = require("fs");

// 读取数据
function loadData(filePath) {
    try {
        const data = fs.readFileSync(filePath, "utf8");
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error loading data: ${error}`);
        return {};
    }
}

// 保存数据
function saveData(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data));
    } catch (error) {
        console.error(`Error saving data: ${error}`);
    }
}
```

### SQLite数据库
```javascript
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./chatlog.db');

// 查询数据
db.all("SELECT * FROM chat_log WHERE user_id = ?", [userId], (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    // 处理查询结果
});

// 插入数据
db.run(
    "INSERT INTO chat_log (user_id, model, prompt, reply, timestamp) VALUES (?, ?, ?, ?, ?)",
    [userId, model, prompt, reply, timestamp]
);
```

## 抽奖系统API

抽奖系统位于`src/commands/lottery/`目录下，提供了一系列用于管理抽奖活动的功能。

### 主要功能

#### 购买彩票
```javascript
// 检查用户余额
if (money[userId] < ticketPrice) {
    return "余额不足";
}

// 扣除费用
money[userId] -= ticketPrice;

// 分配彩票号码
if (!tickets[userId]) {
    tickets[userId] = [];
}
tickets[userId].push(generatedTicketNumber);

// 保存数据
fs.writeFileSync("src/JSON/tickets.json", JSON.stringify(tickets));
fs.writeFileSync("src/JSON/money.json", JSON.stringify(money));
```

#### 抽奖
```javascript
// 构建彩票池
const ticketPool = [];
for (const userId in tickets) {
    tickets[userId].forEach(ticket => {
        ticketPool.push({ userId, ticket });
    });
}

// 随机抽取获奖者
const winners = [];
for (let i = 0; i < prizeCount; i++) {
    if (ticketPool.length === 0) break;
    
    const winnerIndex = Math.floor(Math.random() * ticketPool.length);
    const winner = ticketPool.splice(winnerIndex, 1)[0];
    winners.push(winner);
}
```

## 开发扩展模块

歸終设计为模块化系统，可以通过以下步骤添加新功能：

1. 在适当的目录下创建新的命令或事件处理文件
2. 遵循现有的文件格式和约定
3. 重启机器人以加载新模块

### 示例：创建自定义命令

```javascript
// src/commands/Custom/hello.js
const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("hello")
        .setDescription("回复一个自定义问候"),
    
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle("问候")
            .setDescription(`你好，${interaction.user.username}!`)
            .setColor("#00ff00");
            
        await interaction.reply({ embeds: [embed] });
    }
};
```

## 贡献代码

如果您想为歸終贡献代码，请参阅[贡献指南](../../CONTRIBUTING_ZH-CN.md)。

---

本文档会随着歸終的发展不断更新。如有任何问题或建议，请提交GitHub Issue或加入我们的Discord服务器讨论。