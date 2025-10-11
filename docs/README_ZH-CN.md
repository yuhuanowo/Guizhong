<p align="center">
  <img src="https://github.com/yuhuanowo/Guizhong/blob/main/assets/logo.png?raw=true" width = "100" height = "100"/>
</p>
<h1 align="center">归终</h1>
<p align="center">功能丰富的Discord机器人，支持音乐、AI集成、抽奖等多种功能</p>

<p align="center">
  <a href="https://github.com/yuhuanowo/Guizhong/actions">
    <img alt="测试通过" src="https://github.com/yuhuanowo/Guizhong/workflows/CodeQL/badge.svg" />
  </a>
  <a href="https://github.com/yuhuanowo/Guizhong/graphs/contributors">
    <img alt="GitHub贡献者" src="https://img.shields.io/github/contributors/yuhuanowo/Guizhong" />
  </a>
  <a href="https://github.com/yuhuanowo/Guizhong/issues">
    <img alt="问题" src="https://img.shields.io/github/issues/yuhuanowo/Guizhong" />
  </a>
  <a href="https://github.com/yuhuanowo/Guizhong/blob/master/LICENSE">
    <img alt="许可证" src="https://img.shields.io/github/license/yuhuanowo/Guizhong" />
  </a>
  <a href="https://github.com/yuhuanowo/Guizhong/pulls">
    <img alt="拉取请求" src="https://img.shields.io/github/issues-pr-closed/yuhuanowo/Guizhong" />
  </a>
  <a href="https://github.com/yuhuanowo/Guizhong/commits">
    <img alt="最后提交" src="https://img.shields.io/github/last-commit/yuhuanowo/Guizhong" />
  </a>
  <a href="https://github.com/yuhuanowo/Guizhong"><img alt="统计图表" src="https://repobeats.axiom.co/api/embed/ab7080243cf7b8ed4e30271afc121489272ff6c9.svg"></a>
</p>
<p align="center">
  <a href="https://discord.com/oauth2/authorize?client_id=1082152889209860247" title="邀请 Guizhong 到你的服务器">
    <img alt="邀请 Guizhong" src="https://img.shields.io/badge/邀请%20Guizhong-加入%20服务器-%237289DA?logo=discord&logoColor=white" />
  </a>
</p>

<p align="center">
  <a href="README_ZH-CN.md">简体中文</a> |
  <a href="README_ZH-TW.md">繁體中文</a> |
  <a href="../README.md">English</a>
</p>

## 📋 目录
- [关于归终](#关于归终)
- [功能特色](#功能特色)
- [截图展示](#截图展示)
- [安装指南](#安装指南)
- [配置设置](#配置设置)
- [使用方法](#使用方法)
- [命令列表](#命令列表)
- [参与贡献](#参与贡献)
- [API文档](#api文档)
- [开发计划](#开发计划)
- [许可证](#许可证)
- [致谢](#致谢)

## 🤖 关于归终
归终是一款功能强大的多功能Discord机器人，旨在提升Discord服务器的用户体验。最初创建目的是在许多付费机器人出现在市场上时提供免费的音乐服务，归终已经发展成为一个全面的机器人，提供各种功能，包括音乐播放、AI集成、抽奖系统、每日签到等。

"归终"的名称灵感来自原神游戏中的角色，体现了智慧和助人为乐的品质 - 这也是我们通过这个机器人努力实现的特质。

## ✨ 功能特色
归终拥有丰富的功能：

### 音乐系统
- 多平台支持（YouTube、Spotify、SoundCloud、Apple Music、Vimeo等）
- 完整的播放控制（播放、暂停、跳过、队列管理）
- 音量控制和音频效果
- 歌词集成
- 音乐历史追踪
- 搜索自动完成

### AI集成
- 支持多种AI模型
- 聊天功能
- 文本生成
- 对话历史追踪
- 实时语音对话
- 联网搜寻
- 图片生成

### 经济与互动
- 抽奖系统
- 每日签到系统
- 服务器互动工具

### 管理功能
- 用户管理工具
- 服务器配置
- 可定制命令

<!-- ## 🖼️ 截图展示
<p align="center">
  <img src="../../assets/screenshots/music_player.png" width="400" alt="音乐播放器" />
  <img src="../../assets/screenshots/ai_chat.png" width="400" alt="AI聊天" />
  <img src="../../assets/screenshots/lottery.png" width="400" alt="抽奖系统" />
</p> -->

## 📥 安装指南
按照以下步骤开始使用归终：

### 前置需求
- Node.js (v16.x 或更高版本)
- npm (v7.x 或更高版本)
- Discord机器人令牌
- (可选) 各种服务的API密钥 (Genius, OpenAI等)

### 快速开始
1. 克隆仓库：
   ```bash
   git clone https://github.com/yuhuanowo/Guizhong.git
   cd Guizhong
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

3. 创建配置：
   ```bash
   cp config.example.yml config.yml
   ```

4. 编辑 `config.yml` 文件，填入您的机器人令牌和其他设置。

5. 启动机器人：
   ```bash
   npm start
   ```

有关详细安装说明，请查看我们的[安装指南](installation.zh-CN.md)。

## ⚙️ 配置设置
归终可以通过 `config.yml` 文件进行配置。以下是一些关键配置选项：

- `token`：您的Discord机器人令牌
- `prefix`：文本命令的前缀
- `embedColour`：嵌入消息的默认颜色
- `geniusApiKey`：(可选) Genius歌词服务的API密钥
- `youtubeapikey`：(可选) YouTube API密钥，用于增强YouTube功能
- `openaiApiKey`：(可选) OpenAI API密钥，用于AI功能

有关完整配置指南，请参阅[配置文档](configuration.zh-CN.md)。

## 🎮 使用方法
完成安装和配置后，使用Discord开发者门户中生成的OAuth2 URL邀请机器人加入您的服务器。

### 基本命令
- `/play [歌曲名称或URL]` - 播放歌曲
- `/pause` - 暂停当前歌曲
- `/skip` - 跳到下一首歌曲
- `/queue` - 查看当前歌曲队列
- `/help` - 显示帮助菜单

有关完整的命令列表，请使用 `/help` 命令或参阅[命令文档](commands.zh-CN.md)。

## 🤝 参与贡献
欢迎贡献！提交拉取请求前，请查看我们的[贡献指南](../CONTRIBUTING_ZH-CN.md)。

## 📚 API文档
开发者API文档可在[API文档](api/index.zh-CN.md)文件中找到。

## 🗺️ 开发计划
查看我们的[TODO.md](../TODO.md)文件了解计划的功能和改进。

## 📄 许可证
本项目采用MIT许可证 - 详细信息请见[LICENSE](../LICENSE)文件。

## 🙏 致谢
- 所有帮助过此项目的贡献者
- [discord.js](https://discord.js.org) 提供Discord API封装
- [discord-player](https://discord-player.js.org) 提供音乐播放器功能
- 其他使这个机器人成为可能的库和服务

---

<p align="center">
  由 YuhuanStudio 用 ❤️ 制作
  <br>
  <a href="https://discord.gg/GfUY7ynvXN">加入我们的Discord</a> | 
  <a href="https://github.com/yuhuanowo/Guizhong">GitHub仓库</a> | 
  <a href="https://www.yuhuanstudio.eu.org/">YuhuanStudio 官方网站</a>
  <br>
</p>