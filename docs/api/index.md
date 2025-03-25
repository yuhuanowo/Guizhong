# Guizhong API Documentation

This document provides detailed information about the Guizhong Discord bot API for developers to understand, use, and extend Guizhong's functionality.

## Table of Contents
- [Introduction](#introduction)
- [Core Modules](#core-modules)
- [Event System](#event-system)
- [Command System](#command-system)
- [Music System API](#music-system-api)
- [AI Integration API](#ai-integration-api)
- [Data Storage API](#data-storage-api)
- [Lottery System API](#lottery-system-api)
- [Developing Extension Modules](#developing-extension-modules)
- [Contributing Code](#contributing-code)

## Introduction

Guizhong is a Discord bot developed based on the [discord.js](https://discord.js.org/) library, supporting various features including music playback, AI chat, lottery systems, and more. This API documentation aims to help developers understand Guizhong's internal structure to extend and improve bot functionality.

## Core Modules

Guizhong's core architecture includes the following modules:

### src/bot.js
The main program entry, responsible for initializing the client and loading all modules.

### src/config.js
Configuration manager, responsible for loading configuration information from the config.yml file.

### src/utils/logger.js
Logging management system, providing a unified logging interface.

### src/functions/
Contains three core function handlers:
- `handleEvents.js` - Event handling system
- `handleCommands.js` - Command handling system
- `handleButtons.js` - Button interaction handling system

## Event System

Guizhong uses an event-driven architecture, organizing various event handlers in the `src/events/` directory.

### Registering New Events
To add new event handling, create a new file in the appropriate subdirectory under `src/events/`, following this format:

```javascript
module.exports = {
    name: "eventName", // Discord.js event name, e.g., messageCreate
    once: false,       // Whether to execute only once
    async execute(...args) {
        // Event handling logic
    }
};
```

## Command System

Commands are defined in the `src/commands/` directory, organized by functional categories.

### Adding New Commands
To add a new command, create a new file in the appropriate subdirectory, following this format:

```javascript
const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("commandName")
        .setDescription("Command description")
        .addStringOption(option => 
            option.setName("paramName")
                .setDescription("Parameter description")
                .setRequired(true/false)),
    
    async execute(interaction) {
        // Command execution logic
    }
};
```

## Music System API

Guizhong uses the `discord-player` library to handle music playback, with the main API located in the `src/commands/Player/` directory.

### Main Methods

#### Playing Music
```javascript
const { useMainPlayer } = require("discord-player");
const player = useMainPlayer();

// Search and play music
const searchResult = await player.search(query);
const queue = player.nodes.create(guild);
await queue.node.play(searchResult.tracks[0]);
```

#### Playback Control
```javascript
// Pause
queue.node.pause();

// Resume
queue.node.resume();

// Skip
queue.node.skip();

// Stop
queue.node.stop();
```

## AI Integration API

AI functionality is mainly located in the `src/commands/LLM/` and `src/commands/general/` directories, using various AI API services.

### API Usage Example

```javascript
// OpenAI integration example
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
    apiKey: config.openaiApiKey,
});
const openai = new OpenAIApi(configuration);

// Send request to OpenAI
const response = await openai.createCompletion({
    model: selectedModel,
    messages: messages,
});
```

## Data Storage API

Guizhong uses JSON files and SQLite database for data storage.

### JSON Storage
```javascript
const fs = require("fs");

// Read data
function loadData(filePath) {
    try {
        const data = fs.readFileSync(filePath, "utf8");
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error loading data: ${error}`);
        return {};
    }
}

// Save data
function saveData(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data));
    } catch (error) {
        console.error(`Error saving data: ${error}`);
    }
}
```

### SQLite Database
```javascript
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./chatlog.db');

// Query data
db.all("SELECT * FROM chat_log WHERE user_id = ?", [userId], (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    // Process query results
});

// Insert data
db.run(
    "INSERT INTO chat_log (user_id, model, prompt, reply, timestamp) VALUES (?, ?, ?, ?, ?)",
    [userId, model, prompt, reply, timestamp]
);
```

## Lottery System API

The lottery system is located in the `src/commands/lottery/` directory, providing a series of features for managing lottery activities.

### Main Functions

#### Buying Tickets
```javascript
// Check user balance
if (money[userId] < ticketPrice) {
    return "Insufficient balance";
}

// Deduct cost
money[userId] -= ticketPrice;

// Assign ticket number
if (!tickets[userId]) {
    tickets[userId] = [];
}
tickets[userId].push(generatedTicketNumber);

// Save data
fs.writeFileSync("src/JSON/tickets.json", JSON.stringify(tickets));
fs.writeFileSync("src/JSON/money.json", JSON.stringify(money));
```

#### Drawing Lottery
```javascript
// Build ticket pool
const ticketPool = [];
for (const userId in tickets) {
    tickets[userId].forEach(ticket => {
        ticketPool.push({ userId, ticket });
    });
}

// Randomly select winners
const winners = [];
for (let i = 0; i < prizeCount; i++) {
    if (ticketPool.length === 0) break;
    
    const winnerIndex = Math.floor(Math.random() * ticketPool.length);
    const winner = ticketPool.splice(winnerIndex, 1)[0];
    winners.push(winner);
}
```

## Developing Extension Modules

Guizhong is designed as a modular system, and new functionality can be added via the following steps:

1. Create new command or event handler files in the appropriate directory
2. Follow existing file formats and conventions
3. Restart the bot to load the new module

### Example: Creating a Custom Command

```javascript
// src/commands/Custom/hello.js
const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("hello")
        .setDescription("Replies with a custom greeting"),
    
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle("Greeting")
            .setDescription(`Hello, ${interaction.user.username}!`)
            .setColor("#00ff00");
            
        await interaction.reply({ embeds: [embed] });
    }
};
```

## Contributing Code

If you want to contribute code to Guizhong, please refer to the [Contribution Guidelines](../../CONTRIBUTING.md).

---

This documentation will be continually updated as Guizhong evolves. If you have any questions or suggestions, please submit a GitHub Issue or join our Discord server for discussion.