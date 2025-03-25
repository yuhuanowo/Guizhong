# 歸終配置文檔（繁體中文版）

本文檔詳細介紹了歸終Discord機器人的所有配置選項，幫助您根據自己的需求定制機器人功能。

## 目錄
- [基本配置](#基本配置)
- [音樂功能配置](#音樂功能配置)
- [AI功能配置](#ai功能配置)
- [抽獎系統配置](#抽獎系統配置)
- [簽到系統配置](#簽到系統配置)
- [日誌配置](#日誌配置)
- [高級配置](#高級配置)
- [示例配置文件](#示例配置文件)

## 基本配置

以下是`config.yml`文件中的基本配置選項：

| 配置項 | 說明 | 默認值 | 是否必需 |
|-------|------|-------|---------|
| `token` | Discord機器人令牌，從Discord開發者門戶獲取 | 無 | 是 |
| `prefix` | 文本命令前綴 | `/` | 否 |
| `embedColour` | 嵌入消息的默認顏色(十六進制) | `#0099ff` | 否 |
| `owners` | 機器人管理員用戶ID列表 | `[]` | 否 |

## 音樂功能配置

歸終提供了強大的音樂播放功能，可通過以下選項進行配置：

| 配置項 | 說明 | 默認值 | 是否必需 |
|-------|------|-------|---------|
| `geniusApiKey` | Genius API密鑰，用於獲取歌詞 | 無 | 否 |
| `defaultVolume` | 默認音量(1-100) | `50` | 否 |
| `maxQueueSize` | 最大隊列長度 | `1000` | 否 |
| `autoLeave` | 無人時自動離開語音頻道 | `true` | 否 |
| `autoLeaveCooldown` | 自動離開前等待時間(秒) | `5` | 否 |

### 音樂源配置

| 配置項 | 說明 | 默認值 | 是否必需 |
|-------|------|-------|---------|
| `youtubeapikey` | YouTube API密鑰 | 無 | 否(但推薦) |
| `enableSpotify` | 是否啟用Spotify支持 | `true` | 否 |
| `spotifyClientId` | Spotify客戶端ID | 無 | 僅當啟用Spotify時 |
| `spotifyClientSecret` | Spotify客戶端密鑰 | 無 | 僅當啟用Spotify時 |

## AI功能配置

歸終集成了多種AI服務，支持聊天和文本生成功能：

| 配置項 | 說明 | 默認值 | 是否必需 |
|-------|------|-------|---------|
| `openaiApiKey` | OpenAI API密鑰 | 無 | 僅當使用OpenAI模型時 |

<!-- | `chatLimit` | 每個用戶每日AI聊天限制 | `20` | 否 |
| `aiModels` | 啟用的AI模型列表 | `["gpt-3.5-turbo"]` | 否 |
| `defaultAiModel` | 默認AI模型 | `"gpt-3.5-turbo"` | 否 |
| `aiEndpoints` | 自定義AI端點配置 | `{}` | 否 | -->

<!-- ### 自定義AI端點示例

```yaml
aiEndpoints:
  chatglm:
    url: "http://localhost:8000/v1"
    key: "your_api_key"
  claude:
    url: "https://api.anthropic.com/v1"
    key: "your_anthropic_key"
``` -->

<!-- ## 抽獎系統配置

| 配置項 | 說明 | 默認值 | 是否必需 |
|-------|------|-------|---------|
| `enableLottery` | 是否啟用抽獎系統 | `true` | 否 |
| `ticketPrice` | 彩票價格 | `100` | 否 |
| `maxTicketsPerUser` | 每用戶最大彩票數 | `10` | 否 |
| `drawCooldown` | 抽獎冷卻時間(小時) | `24` | 否 |
| `prizes` | 獎金配置 | `[1000, 500, 250]` | 否 |

## 簽到系統配置

| 配置項 | 說明 | 默認值 | 是否必需 |
|-------|------|-------|---------|
| `enableCheckin` | 是否啟用簽到系統 | `true` | 否 |
| `checkinReward` | 簽到獎勵金額 | `50` | 否 |
| `checkinStreak` | 是否啟用連續簽到獎勵 | `true` | 否 |
| `streakBonus` | 連續簽到額外獎勵 | `10` | 否 | -->

<!-- ## 日誌配置

| 配置項 | 說明 | 默認值 | 是否必需 |
|-------|------|-------|---------|
| `logLevel` | 日誌等級(info, warn, error, debug) | `"info"` | 否 |
| `logToFile` | 是否將日誌寫入文件 | `true` | 否 |
| `logPath` | 日誌文件路徑 | `"logs/"` | 否 |
| `logCommandUsage` | 是否記錄命令使用情況 | `true` | 否 |

## 高級配置

| 配置項 | 說明 | 默認值 | 是否必需 |
|-------|------|-------|---------|
| `shards` | 分片數(用於大型機器人) | `"auto"` | 否 |
| `debug` | 是否啟用調試模式 | `false` | 否 |
| `databaseUrl` | 數據庫連接URL | 無 | 否 |
| `cacheLifetime` | 緩存生命週期(秒) | `600` | 否 |
| `rateLimitAttempts` | 速率限制嘗試次數 | `3` | 否 | -->

## 示例配置文件

以下是一個完整的`config.yml`示例，包含了所有可配置選項：

```yaml
# Your Discord bot token (Found at https://discord.com/developers/applications)
# 您的 Discord 機器人令牌（在 https://discord.com/developers/applications 找到）
botToken: ""

# Your Discord bot client ID
# 您的 Discord 機器人客戶端 ID
clientId: ""

# Your Genius API client access token (Found at https://genius.com/developers)
# 您的 Genius API 客戶端訪問令牌（在 https://genius.com/developers 找到）
geniusApiKey: ""

# The colour to use for embeds sent by the bot
# 機器人發送的嵌入式消息使用的顏色
embedColour: "#F44336"

# Whether the bot should autocomplete search results
# Disable this if you're experiencing Unknown Interaction errors
# 機器人是否應該自動完成搜索結果
# 如果遇到未知的交互錯誤，請禁用此功能
enableAutocomplete: true

# Settings to control the bot's player and controller
# 控制機器人播放器和控制器的設置
player:
    # Leave VC when a song ends
    # 當歌曲結束時離開語音頻道
    leaveOnEndDelay: 300000 # 5 minutes
    # Leave VC when a song is stopped
    # 當歌曲停止時離開語音頻道
    leaveOnStopDelay: 300000 # 5 minutes
    # Leave VC when the channel is empty
    # 當頻道為空時離開語音頻道
    leaveOnEmptyDelay: 300000 # 5 minutes
    # Deafen bot while playing
    # 播放時對機器人拒聽
    deafenBot: true

# The emojis to be used in buttons for certain embeds
# 用於某些嵌入式消息中按鈕的表情符號
emojis:
    stop: "⏹"
    skip: "⏭"
    queue: "📜"
    pause: "⏯"
    lyrics: "📜"
    back: "⏮"
    autoplay: "»"
    shuffle: "🔀"

# Make Guizhong use a proxy when making requests.
# Useful if you're experiencing 429 errors.
# Omit user:pass@ if your proxy does not require authentication.
# 使 Guizhong 在進行請求時使用代理。
# 如果您遇到 429 錯誤，這很有用。
# 如果您的代理不需要身份驗證，請省略 user:pass@
proxy:
    enable: false
    connectionUrl: "http://user:pass@111.111.111.111:8080"

# Make Guizhong use a custom YouTube cookie when making requests.
# This can help to prevent against receiving 429 rate limits from YouTube.
# 使 Guizhong 在進行請求時使用自定義 YouTube cookie。
# 這可以幫助防止收到 YouTube 的 429 速率限制。
cookies:
    useCustomCookie: false
    youtubeCookie: ""

# Your YouTube API key (Found at https://console.developers.google.com/)
# 您的 YouTube API 金鑰（在 https://console.developers.google.com/ 找到）
youtubeapikey: ""

# Your Google API key (Found at https://console.developers.google.com/)
# 您的 Google API 金鑰（在 https://console.developers.google.com/ 找到）
googleapikey: ""

# Your OpenAI API key (Found at https://platform.openai.com/)
# 您的 OpenAI API 金鑰（在 https://platform.openai.com/ 找到）
openaiapikey: ""

# YouTube OAuth tokens
# YouTube OAuth 令牌
YT_ACCESS_TOKEN: ""
YT_REFRESH_TOKEN: ""
oauthTokens: ""

# GitHub Token
# GitHub 令牌
githubToken: ""
```

## 配置文件位置

歸終的配置文件應位於項目根目錄下，命名為`config.yml`。可以通過複製示例配置文件`config.example.yml`並進行修改來創建此文件：

```bash
cp config.example.yml config.yml
```

然後使用文本編輯器（如VS Code、Nano或Vim）編輯該文件。

## 配置生效

修改配置文件後，需要重啟機器人以使更改生效：

```bash
# 如果直接運行
npm run start

# 如果使用PM2
pm2 restart guizhong
```

---

如有任何配置相關問題，請在[GitHub Issues](https://github.com/yuhuanowo/Guizhong/issues)中提出，或加入我們的[Discord服務器](https://discord.gg/GfUY7ynvXN)尋求幫助。