# 歸終(Guizhong)安装指南

本文档提供了详细的安装步骤，帮助您在自己的服务器上成功部署歸終Discord机器人。

## 目录
- [前置条件](#前置条件)
- [基础安装](#基础安装)
- [配置指南](#配置指南)
- [启动机器人](#启动机器人)
- [添加机器人到Discord服务器](#添加机器人到discord服务器)
- [高级配置](#高级配置)
- [常见问题](#常见问题)

## 前置条件

在开始安装歸終之前，您需要确保以下软件和条件已准备就绪：

1. **Node.js** (v16.x 或更高版本)
   - 下载地址: [https://nodejs.org/](https://nodejs.org/)
   - 推荐使用LTS版本

2. **npm** (v7.x 或更高版本，通常随Node.js一起安装)

3. **Git** (用于克隆仓库)
   - 下载地址: [https://git-scm.com/](https://git-scm.com/)

4. **Discord开发者账号和Bot Token**
   - 访问 [Discord开发者门户](https://discord.com/developers/applications)
   - 创建新应用并获取Bot Token

5. **（可选）外部API密钥**
   - Genius API 密钥 (用于歌词功能)
   - YouTube API 密钥 (用于增强YouTube功能)
   - OpenAI API 密钥 (用于AI聊天功能)

## 基础安装

按照以下步骤安装歸終：

1. **克隆仓库**

   使用git命令克隆仓库到本地：
   ```bash
   git clone https://github.com/yuhuanowo/Guizhong.git
   cd Guizhong
   ```

2. **安装依赖**

   在项目根目录下运行：
   ```bash
   npm install
   ```
   这将安装package.json中列出的所有必需依赖项。

3. **创建配置文件**

   复制示例配置文件并重命名：
   ```bash
   cp config.example.yml config.yml
   ```

## 配置指南

安装完依赖后，您需要编辑`config.yml`文件，填入必要的配置信息：

1. **基本配置**

   ```yaml
   token: "YOUR_DISCORD_BOT_TOKEN" # Discord Bot Token
   prefix: "/" # 命令前缀
   embedColour: "#0099ff" # 嵌入消息的颜色
   ```

2. **音乐功能配置**

   ```yaml
   geniusApiKey: "YOUR_GENIUS_API_KEY" # 用于歌词功能
   ```

3. **YouTube API配置**

   ```yaml
   youtubeapikey: "YOUR_YOUTUBE_API_KEY" # 用于YouTube功能增强
   ```

4. **AI功能配置**

   ```yaml
   openaiApiKey: "YOUR_OPENAI_API_KEY" # 用于AI聊天功能
   ```

## 启动机器人

配置完成后，您可以通过以下命令启动机器人：

1. **直接启动**

   ```bash
   npm start
   ```
   或
   ```bash
   node src/bot.js
   ```

2. **使用PM2管理（推荐用于生产环境）**

   首先全局安装PM2：
   ```bash
   npm install -g pm2
   ```
   
   然后使用PM2启动机器人：
   ```bash
   pm2 start src/bot.js --name "guizhong"
   ```
   
   其他PM2常用命令：
   ```bash
   pm2 status # 查看状态
   pm2 logs guizhong # 查看日志
   pm2 restart guizhong # 重启机器人
   pm2 stop guizhong # 停止机器人
   ```

## 添加机器人到Discord服务器

1. 访问 [Discord开发者门户](https://discord.com/developers/applications)
2. 选择您的应用程序
3. 转到"OAuth2" > "URL Generator"
4. 在"Scopes"中选择"bot"和"applications.commands"
5. 在"Bot Permissions"中选择必要的权限：
   - `Send Messages`
   - `Embed Links`
   - `Attach Files`
   - `Read Message History`
   - `Add Reactions`
   - `Connect` (语音连接)
   - `Speak` (语音发言)
   - `Use Voice Activity`
6. 复制生成的URL，在浏览器中打开，选择要添加机器人的服务器

## 高级配置

### 自定义日志配置

您可以在`src/utils/logger.js`中调整日志记录行为。默认情况下，日志将存储在`logs/`目录下。

### 文件权限设置

确保以下目录和文件具有适当的读写权限：
- `logs/` 目录 - 用于日志记录
- `src/JSON/` 目录 - 用于数据存储

## 常见问题

### 无法启动机器人

1. **检查Node.js版本**
   ```bash
   node -v
   ```
   确保版本至少为v16.x

2. **检查配置文件**
   确保`config.yml`格式正确且包含有效的Token

3. **检查日志**
   查看`logs/`目录下的日志文件以获取详细错误信息

### 音乐功能不工作

1. **安装FFmpeg**
   歸終的音乐功能依赖于FFmpeg，确保您的系统上已安装：
   
   - Windows: 下载预编译二进制文件并添加到系统PATH
   - Linux: `sudo apt-get install ffmpeg`
   - macOS: `brew install ffmpeg`

2. **检查网络连接**
   确保您的服务器能够连接到YouTube、Spotify等音乐服务

### 无法使用AI功能

1. **验证API密钥**
   确保您在配置文件中提供了有效的OpenAI API密钥

2. **检查API额度**
   OpenAI API有使用限制，检查您的账户是否有足够的配额

---

如果您在安装过程中遇到其他问题，请在[GitHub Issues](https://github.com/yuhuanowo/Guizhong/issues)中提出，或加入我们的[Discord服务器](https://discord.gg/GfUY7ynvXN)寻求帮助。