# Guizhong Configuration Documentation

This document provides detailed information about all configuration options for the Guizhong Discord bot, helping you customize bot functionality according to your needs.

## Table of Contents
- [Basic Configuration](#basic-configuration)
- [Music Feature Configuration](#music-feature-configuration)
- [AI Feature Configuration](#ai-feature-configuration)
- [Lottery System Configuration](#lottery-system-configuration)
- [Check-in System Configuration](#check-in-system-configuration)
- [Logging Configuration](#logging-configuration)
- [Advanced Configuration](#advanced-configuration)
- [Sample Configuration File](#sample-configuration-file)

## Basic Configuration

The following are basic configuration options in the `config.yml` file:

| Configuration Item | Description | Default Value | Required |
|-------------------|------------|--------------|----------|
| `token` | Discord bot token, obtained from Discord Developer Portal | None | Yes |
| `prefix` | Text command prefix | `/` | No |
| `embedColour` | Default color for embedded messages (hexadecimal) | `#0099ff` | No |
| `owners` | List of bot administrator user IDs | `[]` | No |

## Music Feature Configuration

Guizhong provides powerful music playback features that can be configured using the following options:

| Configuration Item | Description | Default Value | Required |
|-------------------|------------|--------------|----------|
| `geniusApiKey` | Genius API key for retrieving lyrics | None | No |
| `defaultVolume` | Default volume (1-100) | `50` | No |
| `maxQueueSize` | Maximum queue length | `1000` | No |
| `autoLeave` | Automatically leave voice channel when empty | `true` | No |
| `autoLeaveCooldown` | Time to wait before auto-leaving (seconds) | `5` | No |

### Music Source Configuration

| Configuration Item | Description | Default Value | Required |
|-------------------|------------|--------------|----------|
| `youtubeapikey` | YouTube API key | None | No (but recommended) |
| `enableSpotify` | Whether to enable Spotify support | `true` | No |
| `spotifyClientId` | Spotify client ID | None | Only when Spotify enabled |
| `spotifyClientSecret` | Spotify client secret | None | Only when Spotify enabled |

## AI Feature Configuration

Guizhong integrates various AI services, supporting chat and text generation features:

| Configuration Item | Description | Default Value | Required |
|-------------------|------------|--------------|----------|
| `openaiApiKey` | OpenAI API key | None | Only when using OpenAI models |
<!-- | `chatLimit` | Daily AI chat limit per user | `20` | No |
| `aiModels` | List of enabled AI models | `["gpt-3.5-turbo"]` | No |
| `defaultAiModel` | Default AI model | `"gpt-3.5-turbo"` | No |
| `aiEndpoints` | Custom AI endpoint configuration | `{}` | No | -->

<!-- ### Custom AI Endpoint Example

```yaml
aiEndpoints:
  chatglm:
    url: "http://localhost:8000/v1"
    key: "your_api_key"
  claude:
    url: "https://api.anthropic.com/v1"
    key: "your_anthropic_key"
``` -->

<!-- ## Lottery System Configuration

| Configuration Item | Description | Default Value | Required |
|-------------------|------------|--------------|----------|
| `enableLottery` | Whether to enable the lottery system | `true` | No |
| `ticketPrice` | Ticket price | `100` | No |
| `maxTicketsPerUser` | Maximum tickets per user | `10` | No |
| `drawCooldown` | Draw cooldown time (hours) | `24` | No |
| `prizes` | Prize configuration | `[1000, 500, 250]` | No |

## Check-in System Configuration

| Configuration Item | Description | Default Value | Required |
|-------------------|------------|--------------|----------|
| `enableCheckin` | Whether to enable the check-in system | `true` | No |
| `checkinReward` | Check-in reward amount | `50` | No |
| `checkinStreak` | Whether to enable consecutive check-in rewards | `true` | No |
| `streakBonus` | Additional reward for consecutive check-ins | `10` | No | -->

<!-- ## Logging Configuration

| Configuration Item | Description | Default Value | Required |
|-------------------|------------|--------------|----------|
| `logLevel` | Log level (info, warn, error, debug) | `"info"` | No |
| `logToFile` | Whether to write logs to a file | `true` | No |
| `logPath` | Log file path | `"logs/"` | No |
| `logCommandUsage` | Whether to record command usage | `true` | No |

## Advanced Configuration

| Configuration Item | Description | Default Value | Required |
|-------------------|------------|--------------|----------|
| `shards` | Number of shards (for large bots) | `"auto"` | No |
| `debug` | Whether to enable debug mode | `false` | No |
| `databaseUrl` | Database connection URL | None | No |
| `cacheLifetime` | Cache lifetime (seconds) | `600` | No |
| `rateLimitAttempts` | Rate limit attempt count | `3` | No | -->

## Sample Configuration File

Below is a complete `config.yml` example containing all configurable options:

```yaml
# Your Discord bot token (Found at https://discord.com/developers/applications)
botToken: ""

# Your Discord bot client ID
clientId: ""

# Your Genius API client access token (Found at https://genius.com/developers)
geniusApiKey: ""

# The colour to use for embeds sent by the bot
embedColour: "#F44336"

# Whether the bot should autocomplete search results
# Disable this if you're experiencing Unknown Interaction errors
enableAutocomplete: true

# Settings to control the bot's player and controller
player:
    # Leave VC when a song ends
    leaveOnEndDelay: 300000 # 5 minutes
    # Leave VC when a song is stopped
    leaveOnStopDelay: 300000 # 5 minutes
    # Leave VC when the channel is empty
    leaveOnEmptyDelay: 300000 # 5 minutes
    # Deafen bot while playing
    deafenBot: true

# The emojis to be used in buttons for certain embeds
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
proxy:
    enable: false
    connectionUrl: "http://user:pass@111.111.111.111:8080"

# Make Guizhong use a custom YouTube cookie when making requests.
# This can help to prevent against receiving 429 rate limits from YouTube.
cookies:
    useCustomCookie: false
    youtubeCookie: ""

# Your YouTube API key (Found at https://console.developers.google.com/)
youtubeapikey: ""

# Your Google API key (Found at https://console.developers.google.com/)
googleapikey: ""

# Your OpenAI API key (Found at https://platform.openai.com/)
openaiapikey: ""

# YouTube OAuth tokens
YT_ACCESS_TOKEN: ""
YT_REFRESH_TOKEN: ""
oauthTokens: ""

# GitHub Token
githubToken: ""
```

## Configuration File Location

Guizhong's configuration file should be located in the project's root directory, named `config.yml`. You can create this file by copying the example configuration file `config.example.yml` and modifying it:

```bash
cp config.example.yml config.yml
```

Then edit the file using a text editor (such as VS Code, Nano, or Vim).

## Configuration Changes Taking Effect

After modifying the configuration file, you need to restart the bot for the changes to take effect:

```bash
# If running directly
npm run start

# If using PM2
pm2 restart guizhong
```

---

If you have any configuration-related questions, please raise them in [GitHub Issues](https://github.com/yuhuanowo/Guizhong/issues) or join our [Discord server](https://discord.gg/GfUY7ynvXN) for help.