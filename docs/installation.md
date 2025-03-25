# Guizhong Installation Guide

This document provides detailed installation steps to help you successfully deploy the Guizhong Discord bot on your own server.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Basic Installation](#basic-installation)
- [Configuration Guide](#configuration-guide)
- [Starting the Bot](#starting-the-bot)
- [Adding Bot to Discord Server](#adding-bot-to-discord-server)
- [Advanced Configuration](#advanced-configuration)
- [Common Issues](#common-issues)

## Prerequisites

Before installing Guizhong, you need to ensure the following software and conditions are ready:

1. **Node.js** (v16.x or higher)
   - Download from: [https://nodejs.org/](https://nodejs.org/)
   - LTS version recommended

2. **npm** (v7.x or higher, usually installed with Node.js)

3. **Git** (for cloning repository)
   - Download from: [https://git-scm.com/](https://git-scm.com/)

4. **Discord Developer Account and Bot Token**
   - Visit [Discord Developer Portal](https://discord.com/developers/applications)
   - Create new application and obtain Bot Token

5. **(Optional) External API Keys**
   - Genius API key (for lyrics functionality)
   - YouTube API key (for enhanced YouTube features)
   - OpenAI API key (for AI chat functionality)

## Basic Installation

Follow these steps to install Guizhong:

1. **Clone Repository**

   Use git command to clone the repository locally:
   ```bash
   git clone https://github.com/yuhuanowo/Guizhong.git
   cd Guizhong
   ```

2. **Install Dependencies**

   In the project root directory, run:
   ```bash
   npm install
   ```
   This will install all required dependencies listed in package.json.

3. **Create Configuration File**

   Copy the example configuration file and rename it:
   ```bash
   cp config.example.yml config.yml
   ```

## Configuration Guide

After installing dependencies, you need to edit the `config.yml` file and fill in the necessary configuration information:

1. **Basic Configuration**

   ```yaml
   token: "YOUR_DISCORD_BOT_TOKEN" # Discord Bot Token
   prefix: "/" # Command prefix
   embedColour: "#0099ff" # Color for embedded messages
   ```

2. **Music Feature Configuration**

   ```yaml
   geniusApiKey: "YOUR_GENIUS_API_KEY" # For lyrics functionality
   ```

3. **YouTube API Configuration**

   ```yaml
   youtubeapikey: "YOUR_YOUTUBE_API_KEY" # For YouTube feature enhancement
   ```

4. **AI Feature Configuration**

   ```yaml
   openaiApiKey: "YOUR_OPENAI_API_KEY" # For AI chat functionality
   ```

## Starting the Bot

After configuration is complete, you can start the bot using the following commands:

1. **Direct Start**

   ```bash
   npm start
   ```
   or
   ```bash
   node src/bot.js
   ```

2. **Using PM2 (Recommended for Production Environment)**

   First, install PM2 globally:
   ```bash
   npm install -g pm2
   ```
   
   Then start the bot using PM2:
   ```bash
   pm2 start src/bot.js --name "guizhong"
   ```
   
   Other common PM2 commands:
   ```bash
   pm2 status # Check status
   pm2 logs guizhong # View logs
   pm2 restart guizhong # Restart bot
   pm2 stop guizhong # Stop bot
   ```

## Adding Bot to Discord Server

1. Visit [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Go to "OAuth2" > "URL Generator"
4. Under "Scopes", select "bot" and "applications.commands"
5. Under "Bot Permissions", select necessary permissions:
   - `Send Messages`
   - `Embed Links`
   - `Attach Files`
   - `Read Message History`
   - `Add Reactions`
   - `Connect` (voice connection)
   - `Speak` (voice speaking)
   - `Use Voice Activity`
6. Copy the generated URL, open it in a browser, and select the server to add the bot to

## Advanced Configuration

### Custom Log Configuration

You can adjust logging behavior in `src/utils/logger.js`. By default, logs will be stored in the `logs/` directory.

### File Permissions

Ensure the following directories and files have appropriate read/write permissions:
- `logs/` directory - for log recording
- `src/JSON/` directory - for data storage

## Common Issues

### Bot Won't Start

1. **Check Node.js Version**
   ```bash
   node -v
   ```
   Ensure version is at least v16.x

2. **Check Configuration File**
   Ensure `config.yml` is properly formatted and contains valid Token

3. **Check Logs**
   View log files in the `logs/` directory for detailed error information

### Music Features Not Working

1. **Install FFmpeg**
   Guizhong's music functionality depends on FFmpeg, ensure it's installed on your system:
   
   - Windows: Download precompiled binary and add to system PATH
   - Linux: `sudo apt-get install ffmpeg`
   - macOS: `brew install ffmpeg`

2. **Check Network Connection**
   Ensure your server can connect to YouTube, Spotify, and other music services

### AI Features Not Working

1. **Verify API Key**
   Ensure you've provided a valid OpenAI API key in the configuration file

2. **Check API Quota**
   OpenAI API has usage limits, check if your account has sufficient quota

---

If you encounter any other issues during installation, please raise them in [GitHub Issues](https://github.com/yuhuanowo/Guizhong/issues) or join our [Discord server](https://discord.gg/GfUY7ynvXN) for help.