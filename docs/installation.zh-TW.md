# 歸終(Guizhong)安裝指南

本文檔提供了詳細的安裝步驟，幫助您在自己的服務器上成功部署歸終Discord機器人。

## 目錄
- [前置條件](#前置條件)
- [基礎安裝](#基礎安裝)
- [配置指南](#配置指南)
- [啟動機器人](#啟動機器人)
- [添加機器人到Discord服務器](#添加機器人到discord服務器)
- [高級配置](#高級配置)
- [常見問題](#常見問題)

## 前置條件

在開始安裝歸終之前，您需要確保以下軟件和條件已準備就緒：

1. **Node.js** (v16.x 或更高版本)
   - 下載地址: [https://nodejs.org/](https://nodejs.org/)
   - 推薦使用LTS版本

2. **npm** (v7.x 或更高版本，通常隨Node.js一起安裝)

3. **Git** (用於克隆倉庫)
   - 下載地址: [https://git-scm.com/](https://git-scm.com/)

4. **Discord開發者賬號和Bot Token**
   - 訪問 [Discord開發者門戶](https://discord.com/developers/applications)
   - 創建新應用並獲取Bot Token

5. **（可選）外部API密鑰**
   - Genius API 密鑰 (用於歌詞功能)
   - YouTube API 密鑰 (用於增強YouTube功能)
   - OpenAI API 密鑰 (用於AI聊天功能)

## 基礎安裝

按照以下步驟安裝歸終：

1. **克隆倉庫**

   使用git命令克隆倉庫到本地：
   ```bash
   git clone https://github.com/yuhuanowo/Guizhong.git
   cd Guizhong
   ```

2. **安裝依賴**

   在項目根目錄下運行：
   ```bash
   npm install
   ```
   這將安裝package.json中列出的所有必需依賴項。

3. **創建配置文件**

   複製示例配置文件並重命名：
   ```bash
   cp config.example.yml config.yml
   ```

## 配置指南

安裝完依賴後，您需要編輯`config.yml`文件，填入必要的配置信息：

1. **基本配置**

   ```yaml
   token: "YOUR_DISCORD_BOT_TOKEN" # Discord Bot Token
   prefix: "/" # 命令前綴
   embedColour: "#0099ff" # 嵌入消息的顏色
   ```

2. **音樂功能配置**

   ```yaml
   geniusApiKey: "YOUR_GENIUS_API_KEY" # 用於歌詞功能
   ```

3. **YouTube API配置**

   ```yaml
   youtubeapikey: "YOUR_YOUTUBE_API_KEY" # 用於YouTube功能增強
   ```

4. **AI功能配置**

   ```yaml
   openaiApiKey: "YOUR_OPENAI_API_KEY" # 用於AI聊天功能
   ```

## 啟動機器人

配置完成後，您可以通過以下命令啟動機器人：

1. **直接啟動**

   ```bash
   npm start
   ```
   或
   ```bash
   node src/bot.js
   ```

2. **使用PM2管理（推薦用於生產環境）**

   首先全局安裝PM2：
   ```bash
   npm install -g pm2
   ```
   
   然後使用PM2啟動機器人：
   ```bash
   pm2 start src/bot.js --name "guizhong"
   ```
   
   其他PM2常用命令：
   ```bash
   pm2 status # 查看狀態
   pm2 logs guizhong # 查看日誌
   pm2 restart guizhong # 重啟機器人
   pm2 stop guizhong # 停止機器人
   ```

## 添加機器人到Discord服務器

1. 訪問 [Discord開發者門戶](https://discord.com/developers/applications)
2. 選擇您的應用程序
3. 轉到"OAuth2" > "URL Generator"
4. 在"Scopes"中選擇"bot"和"applications.commands"
5. 在"Bot Permissions"中選擇必要的權限：
   - `Send Messages`
   - `Embed Links`
   - `Attach Files`
   - `Read Message History`
   - `Add Reactions`
   - `Connect` (語音連接)
   - `Speak` (語音發言)
   - `Use Voice Activity`
6. 複製生成的URL，在瀏覽器中打開，選擇要添加機器人的服務器

## 高級配置
<!-- 
### 使用Docker部署

如果您熟悉Docker，也可以使用Docker部署歸終：

1. **创建Dockerfile**（如果仓库中没有）：
   ```dockerfile
   FROM node:16
   
   WORKDIR /usr/src/guizhong
   
   COPY package*.json ./
   RUN npm install
   
   COPY . .
   
   CMD ["node", "src/bot.js"]
   ```

2. **构建并运行Docker镜像**：
   ```bash
   docker build -t guizhong .
   docker run -d --name guizhong-bot guizhong
   ``` -->

### 自定義日誌配置

您可以在`src/utils/logger.js`中調整日誌記錄行為。默認情況下，日誌將存儲在`logs/`目錄下。

### 文件權限設置

確保以下目錄和文件具有適當的讀寫權限：
- `logs/` 目錄 - 用於日誌記錄
- `src/JSON/` 目錄 - 用於數據存儲

## 常見問題

### 無法啟動機器人

1. **檢查Node.js版本**
   ```bash
   node -v
   ```
   確保版本至少為v16.x

2. **檢查配置文件**
   確保`config.yml`格式正確且包含有效的Token

3. **檢查日誌**
   查看`logs/`目錄下的日誌文件以獲取詳細錯誤信息

### 音樂功能不工作

1. **安裝FFmpeg**
   歸終的音樂功能依賴於FFmpeg，確保您的系統上已安裝：
   
   - Windows: 下載預編譯二進制文件並添加到系統PATH
   - Linux: `sudo apt-get install ffmpeg`
   - macOS: `brew install ffmpeg`

2. **檢查網絡連接**
   確保您的服務器能夠連接到YouTube、Spotify等音樂服務

### 無法使用AI功能

1. **驗證API密鑰**
   確保您在配置文件中提供了有效的OpenAI API密鑰

2. **檢查API額度**
   OpenAI API有使用限制，檢查您的賬戶是否有足夠的配額

---

如果您在安裝過程中遇到其他問題，請在[GitHub Issues](https://github.com/yuhuanowo/Guizhong/issues)中提出，或加入我們的[Discord服務器](https://discord.gg/GfUY7ynvXN)尋求幫助。