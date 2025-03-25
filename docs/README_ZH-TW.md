<p align="center">
  <img src="https://github.com/yuhuanowo/Guizhong/blob/main/assets/logo.png?raw=true" width = "100" height = "100"/>
</p>
<h1 align="center">歸終</h1>
<p align="center">功能豐富的Discord機器人，支持音樂、AI整合、抽獎等多種功能</p>

<p align="center">
  <a href="https://github.com/yuhuanowo/Guizhong/actions">
    <img alt="測試通過" src="https://github.com/yuhuanowo/Guizhong/workflows/CodeQL/badge.svg" />
  </a>
  <a href="https://github.com/yuhuanowo/Guizhong/graphs/contributors">
    <img alt="GitHub貢獻者" src="https://img.shields.io/github/contributors/yuhuanowo/Guizhong" />
  </a>
  <a href="https://github.com/yuhuanowo/Guizhong/issues">
    <img alt="問題" src="https://img.shields.io/github/issues/yuhuanowo/Guizhong" />
  </a>
  <a href="https://github.com/yuhuanowo/Guizhong/blob/master/LICENSE">
    <img alt="許可證" src="https://img.shields.io/github/license/yuhuanowo/Guizhong" />
  </a>
  <a href="https://github.com/yuhuanowo/Guizhong/pulls">
    <img alt="拉取請求" src="https://img.shields.io/github/issues-pr-closed/yuhuanowo/Guizhong" />
  </a>
  <a href="https://github.com/yuhuanowo/Guizhong/commits">
    <img alt="最後提交" src="https://img.shields.io/github/last-commit/yuhuanowo/Guizhong" />
  </a>
  <a href="https://github.com/yuhuanowo/Guizhong"><img alt="統計圖表" src="https://repobeats.axiom.co/api/embed/ab7080243cf7b8ed4e30271afc121489272ff6c9.svg"></a>
</p>

<p align="center">
  <a href="README_ZH-CN.md">简体中文</a> |
  <a href="README_ZH-TW.md">繁體中文</a> |
  <a href="../README.md">English</a>
</p>

## 📋 目錄
- [關於歸終](#關於歸終)
- [功能特色](#功能特色)
- [截圖展示](#截圖展示)
- [安裝指南](#安裝指南)
- [配置設定](#配置設定)
- [使用方法](#使用方法)
- [指令列表](#指令列表)
- [參與貢獻](#參與貢獻)
- [API文檔](#api文檔)
- [開發計劃](#開發計劃)
- [許可證](#許可證)
- [致謝](#致謝)

## 🤖 關於歸終
歸終是一款功能強大的多功能Discord機器人，旨在提升Discord伺服器的用戶體驗。最初創建目的是在許多付費機器人出現在市場上時提供免費的音樂服務，歸終已經發展成為一個全面的機器人，提供各種功能，包括音樂播放、AI整合、抽獎系統、每日簽到等。

"歸終"的名稱靈感來自原神遊戲中的角色，體現了智慧和助人為樂的品質 - 這也是我們通過這個機器人努力實現的特質。

## ✨ 功能特色
歸終擁有豐富的功能：

### 音樂系統
- 多平台支援（YouTube、Spotify、SoundCloud、Apple Music、Vimeo等）
- 完整的播放控制（播放、暫停、跳過、隊列管理）
- 音量控制和音頻效果
- 歌詞整合
- 音樂歷史追蹤
- 搜索自動完成

### AI整合
- 支援多種AI模型
- 聊天功能
- 文本生成
- 對話歷史追蹤
- 實時語音對話
- 聯網搜尋
- 圖片生成

### 經濟與互動
- 抽獎系統
- 每日簽到系統
- 伺服器互動工具

### 管理功能
- 用戶管理工具
- 伺服器配置
- 可定制指令

<!-- ## 🖼️ 截圖展示
<p align="center">
  <img src="../../assets/screenshots/music_player.png" width="400" alt="音樂播放器" />
  <img src="../../assets/screenshots/ai_chat.png" width="400" alt="AI聊天" />
  <img src="../../assets/screenshots/lottery.png" width="400" alt="抽獎系統" />
</p> -->

## 📥 安裝指南
按照以下步驟開始使用歸終：

### 前置需求
- Node.js (v16.x 或更高版本)
- npm (v7.x 或更高版本)
- Discord機器人令牌
- (可選) 各種服務的API密鑰 (Genius, OpenAI等)

### 快速開始
1. 克隆存儲庫：
   ```bash
   git clone https://github.com/yuhuanowo/Guizhong.git
   cd Guizhong
   ```

2. 安裝依賴：
   ```bash
   npm install
   ```

3. 創建配置：
   ```bash
   cp config.example.yml config.yml
   ```

4. 編輯 `config.yml` 文件，填入您的機器人令牌和其他設置。

5. 啟動機器人：
   ```bash
   npm start
   ```

有關詳細安裝說明，請查看我們的[安裝指南](installation.zh-TW.md)。

## ⚙️ 配置設定
歸終可以通過 `config.yml` 文件進行配置。以下是一些關鍵配置選項：

- `token`：您的Discord機器人令牌
- `prefix`：文本指令的前綴
- `embedColour`：嵌入消息的默認顏色
- `geniusApiKey`：(可選) Genius歌詞服務的API密鑰
- `youtubeapikey`：(可選) YouTube API密鑰，用於增強YouTube功能
- `openaiApiKey`：(可選) OpenAI API密鑰，用於AI功能

有關完整配置指南，請參閱[配置文檔](configuration.zh-TW.md)。

## 🎮 使用方法
完成安裝和配置後，使用Discord開發者門戶中生成的OAuth2 URL邀請機器人加入您的伺服器。

### 基本指令
- `/play [歌曲名稱或URL]` - 播放歌曲
- `/pause` - 暫停當前歌曲
- `/skip` - 跳到下一首歌曲
- `/queue` - 查看當前歌曲隊列
- `/help` - 顯示幫助菜單
- `/chat` - 與AI聊天

有關完整的指令列表，請使用 `/help` 指令或參閱[指令文檔](commands.zh-TW.md)。

## 🤝 參與貢獻
歡迎貢獻！提交拉取請求前，請查看我們的[貢獻指南](../CONTRIBUTING_ZH-TW.md)。

## 📚 API文檔
開發者API文檔可在[API文檔](api/index.zh-TW.md)文件中找到。

## 🗺️ 開發計劃
查看我們的[TODO.md](../TODO.md)文件了解計劃的功能和改進。

## 📄 許可證
本專案採用MIT許可證 - 詳細信息請見[LICENSE](../LICENSE)文件。

## 🙏 致謝
- 所有幫助過此專案的貢獻者
- [discord.js](https://discord.js.org) 提供Discord API封裝
- [discord-player](https://discord-player.js.org) 提供音樂播放器功能
- 其他使這個機器人成為可能的庫和服務

---

<p align="center">
  由 YuhuanStudio 用 ❤️ 製作
  <br>
  <a href="https://discord.gg/GfUY7ynvXN">加入我們的Discord</a> | 
  <a href="https://github.com/yuhuanowo/Guizhong">GitHub儲存庫</a>| 
  <a href="https://www.yuhuanstudio.eu.org/">YuhuanStudio 官方網站</a>
  <br>
</p>