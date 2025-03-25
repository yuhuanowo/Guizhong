# 歸終配置文档（简体中文版）

本文档详细介绍了歸終Discord机器人的所有配置选项，帮助您根据自己的需求定制机器人功能。

## 目录
- [基本配置](#基本配置)
- [音乐功能配置](#音乐功能配置)
- [AI功能配置](#ai功能配置)
- [抽奖系统配置](#抽奖系统配置)
- [签到系统配置](#签到系统配置)
- [日志配置](#日志配置)
- [高级配置](#高级配置)
- [示例配置文件](#示例配置文件)

## 基本配置

以下是`config.yml`文件中的基本配置选项：

| 配置项 | 说明 | 默认值 | 是否必需 |
|-------|------|-------|---------|
| `token` | Discord机器人令牌，从Discord开发者门户获取 | 无 | 是 |
| `prefix` | 文本命令前缀 | `/` | 否 |
| `embedColour` | 嵌入消息的默认颜色(十六进制) | `#0099ff` | 否 |
| `owners` | 机器人管理员用户ID列表 | `[]` | 否 |

## 音乐功能配置

歸終提供了强大的音乐播放功能，可通过以下选项进行配置：

| 配置项 | 说明 | 默认值 | 是否必需 |
|-------|------|-------|---------|
| `geniusApiKey` | Genius API密钥，用于获取歌词 | 无 | 否 |
| `defaultVolume` | 默认音量(1-100) | `50` | 否 |
| `maxQueueSize` | 最大队列长度 | `1000` | 否 |
| `autoLeave` | 无人时自动离开语音频道 | `true` | 否 |
| `autoLeaveCooldown` | 自动离开前等待时间(秒) | `5` | 否 |

### 音乐源配置

| 配置项 | 说明 | 默认值 | 是否必需 |
|-------|------|-------|---------|
| `youtubeapikey` | YouTube API密钥 | 无 | 否(但推荐) |
| `enableSpotify` | 是否启用Spotify支持 | `true` | 否 |
| `spotifyClientId` | Spotify客户端ID | 无 | 仅当启用Spotify时 |
| `spotifyClientSecret` | Spotify客户端密钥 | 无 | 仅当启用Spotify时 |

## AI功能配置

歸終集成了多种AI服务，支持聊天和文本生成功能：

| 配置项 | 说明 | 默认值 | 是否必需 |
|-------|------|-------|---------|
| `openaiApiKey` | OpenAI API密钥 | 无 | 仅当使用OpenAI模型时 |
<!-- | `chatLimit` | 每个用户每日AI聊天限制 | `20` | 否 |
| `aiModels` | 启用的AI模型列表 | `["gpt-3.5-turbo"]` | 否 |
| `defaultAiModel` | 默认AI模型 | `"gpt-3.5-turbo"` | 否 |
| `aiEndpoints` | 自定义AI端点配置 | `{}` | 否 | -->

<!-- ### 自定义AI端点示例

```yaml
aiEndpoints:
  chatglm:
    url: "http://localhost:8000/v1"
    key: "your_api_key"
  claude:
    url: "https://api.anthropic.com/v1"
    key: "your_anthropic_key"
``` -->

<!-- ## 抽奖系统配置

| 配置项 | 说明 | 默认值 | 是否必需 |
|-------|------|-------|---------|
| `enableLottery` | 是否启用抽奖系统 | `true` | 否 |
| `ticketPrice` | 彩票价格 | `100` | 否 |
| `maxTicketsPerUser` | 每用户最大彩票数 | `10` | 否 |
| `drawCooldown` | 抽奖冷却时间(小时) | `24` | 否 |
| `prizes` | 奖金配置 | `[1000, 500, 250]` | 否 |

## 签到系统配置

| 配置项 | 说明 | 默认值 | 是否必需 |
|-------|------|-------|---------|
| `enableCheckin` | 是否启用签到系统 | `true` | 否 |
| `checkinReward` | 签到奖励金额 | `50` | 否 |
| `checkinStreak` | 是否启用连续签到奖励 | `true` | 否 |
| `streakBonus` | 连续签到额外奖励 | `10` | 否 | -->

<!-- ## 日志配置

| 配置项 | 说明 | 默认值 | 是否必需 |
|-------|------|-------|---------|
| `logLevel` | 日志等级(info, warn, error, debug) | `"info"` | 否 |
| `logToFile` | 是否将日志写入文件 | `true` | 否 |
| `logPath` | 日志文件路径 | `"logs/"` | 否 |
| `logCommandUsage` | 是否记录命令使用情况 | `true` | 否 |

## 高级配置

| 配置项 | 说明 | 默认值 | 是否必需 |
|-------|------|-------|---------|
| `shards` | 分片数(用于大型机器人) | `"auto"` | 否 |
| `debug` | 是否启用调试模式 | `false` | 否 |
| `databaseUrl` | 数据库连接URL | 无 | 否 |
| `cacheLifetime` | 缓存生命周期(秒) | `600` | 否 |
| `rateLimitAttempts` | 速率限制尝试次数 | `3` | 否 | -->

## 示例配置文件

以下是一个完整的`config.yml`示例，包含了所有可配置选项：

```yaml
# Your Discord bot token (Found at https://discord.com/developers/applications)
# 您的 Discord 機器人令牌（在 https://discord.com/developers/applications 找到）
# 您的 Discord 机器人令牌（在 https://discord.com/developers/applications 找到）
botToken: ""

# Your Discord bot client ID
# 您的 Discord 機器人客戶端 ID
# 您的 Discord 机器人客户端 ID
clientId: ""

# Your Genius API client access token (Found at https://genius.com/developers)
# 您的 Genius API 客戶端訪問令牌（在 https://genius.com/developers 找到）
# 您的 Genius API 客户端访问令牌（在 https://genius.com/developers 找到）
geniusApiKey: ""

# The colour to use for embeds sent by the bot
# 機器人發送的嵌入式消息使用的顏色
# 机器人发送的嵌入式消息使用的颜色
embedColour: "#F44336"

# Whether the bot should autocomplete search results
# Disable this if you're experiencing Unknown Interaction errors
# 機器人是否應該自動完成搜索結果
# 如果遇到未知的交互錯誤，請禁用此功能
# 机器人是否应该自动完成搜索结果
# 如果遇到未知的交互错误，请禁用此功能
enableAutocomplete: true

# Settings to control the bot's player and controller
# 控制機器人播放器和控制器的設置
# 控制机器人播放器和控制器的设置
player:
    # Leave VC when a song ends
    # 當歌曲結束時離開語音頻道
    # 当歌曲结束时离开语音频道
    leaveOnEndDelay: 300000 # 5 minutes
    # Leave VC when a song is stopped
    # 當歌曲停止時離開語音頻道
    # 当歌曲停止时离开语音频道
    leaveOnStopDelay: 300000 # 5 minutes
    # Leave VC when the channel is empty
    # 當頻道為空時離開語音頻道
    # 当频道为空时离开语音频道
    leaveOnEmptyDelay: 300000 # 5 minutes
    # Deafen bot while playing
    # 播放時對機器人拒聽
    # 播放时对机器人拒听
    deafenBot: true

# The emojis to be used in buttons for certain embeds
# 用於某些嵌入式消息中按鈕的表情符號
# 用于某些嵌入式消息中按钮的表情符号
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
# 使 Guizhong 在进行请求时使用代理。
# 如果您遇到 429 错误，这很有用。
# 如果您的代理不需要身份验证，请省略 user:pass@
proxy:
    enable: false
    connectionUrl: "http://user:pass@111.111.111.111:8080"

# Make Guizhong use a custom YouTube cookie when making requests.
# This can help to prevent against receiving 429 rate limits from YouTube.
# 使 Guizhong 在進行請求時使用自定義 YouTube cookie。
# 這可以幫助防止收到 YouTube 的 429 速率限制。
# 使 Guizhong 在进行请求时使用自定义 YouTube cookie。
# 这可以帮助防止收到 YouTube 的 429 速率限制。
cookies:
    useCustomCookie: false
    youtubeCookie: ""

# Your YouTube API key (Found at https://console.developers.google.com/)
# 您的 YouTube API 金鑰（在 https://console.developers.google.com/ 找到）
# 您的 YouTube API 密钥（在 https://console.developers.google.com/ 找到）
youtubeapikey: ""

# Your Google API key (Found at https://console.developers.google.com/)
# 您的 Google API 金鑰（在 https://console.developers.google.com/ 找到）
# 您的 Google API 密钥（在 https://console.developers.google.com/ 找到）
googleapikey: ""

# Your OpenAI API key (Found at https://platform.openai.com/)
# 您的 OpenAI API 金鑰（在 https://platform.openai.com/ 找到）
# 您的 OpenAI API 密钥（在 https://platform.openai.com/ 找到）
openaiapikey: ""

# YouTube OAuth tokens
# YouTube OAuth 令牌
# YouTube OAuth 令牌
YT_ACCESS_TOKEN: ""
YT_REFRESH_TOKEN: ""
oauthTokens: ""

# GitHub Token
# GitHub 令牌
# GitHub 令牌
githubToken: ""
```

## 配置文件位置

歸終的配置文件应位于项目根目录下，命名为`config.yml`。可以通过复制示例配置文件`config.example.yml`并进行修改来创建此文件：

```bash
cp config.example.yml config.yml
```

然后使用文本编辑器（如VS Code、Nano或Vim）编辑该文件。

## 配置生效

修改配置文件后，需要重启机器人以使更改生效：

```bash
# 如果直接运行
npm run start

# 如果使用PM2
pm2 restart guizhong
```

---

如有任何配置相关问题，请在[GitHub Issues](https://github.com/yuhuanowo/Guizhong/issues)中提出，或加入我们的[Discord服务器](https://discord.gg/GfUY7ynvXN)寻求帮助。