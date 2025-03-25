<p align="center">
  <img src="https://github.com/yuhuanowo/Guizhong/blob/main/assets/logo.png?raw=true" width = "100" height = "100"/>
</p>
<h1 align="center">Guizhong</h1>
<p align="center">A feature-rich Discord bot with music, AI integration, lottery, and more.</p>

<p align="center">
  <a href="https://github.com/yuhuanowo/Guizhong/actions">
    <img alt="Tests Passing" src="https://github.com/yuhuanowo/Guizhong/workflows/CodeQL/badge.svg" />
  </a>
  <a href="https://github.com/yuhuanowo/Guizhong/graphs/contributors">
    <img alt="GitHub Contributors" src="https://img.shields.io/github/contributors/yuhuanowo/Guizhong" />
  </a>
  <a href="https://github.com/yuhuanowo/Guizhong/issues">
    <img alt="Issues" src="https://img.shields.io/github/issues/yuhuanowo/Guizhong" />
  </a>
  <a href="https://github.com/yuhuanowo/Guizhong/blob/master/LICENSE">
    <img alt="License" src="https://img.shields.io/github/license/yuhuanowo/Guizhong" />
  </a>
  <a href="https://github.com/yuhuanowo/Guizhong/pulls">
    <img alt="Pull Requests" src="https://img.shields.io/github/issues-pr-closed/yuhuanowo/Guizhong" />
  </a>
  <a href="https://github.com/yuhuanowo/Guizhong/commits">
    <img alt="Last Commit" src="https://img.shields.io/github/last-commit/yuhuanowo/Guizhong" />
  </a>
  <a href="https://github.com/yuhuanowo/Guizhong"><img alt="Statistics Graphs" src="https://repobeats.axiom.co/api/embed/ab7080243cf7b8ed4e30271afc121489272ff6c9.svg"></a>
</p>

<p align="center">
  <a href="docs/README_ZH-CN.md">简体中文</a> |
  <a href="docs/README_ZH-TW.md">繁體中文</a> |
  <a href="README.md">English</a>
</p>

## 📋 Table of Contents
- [About Guizhong](#about-guizhong)
- [Features](#features)
- [Screenshots](#screenshots)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Commands](#commands)
- [Contributing](#contributing)
- [API Documentation](#api-documentation)
- [Roadmap](#roadmap)
- [License](#license)
- [Acknowledgements](#acknowledgements)

## 🤖 About Guizhong
Guizhong is a powerful, multifunctional Discord bot developed to enhance user experience on Discord servers. Originally created to provide free music services when many premium bots appeared on the market, Guizhong has evolved into a comprehensive bot offering various features including music playback, AI integration, lottery systems, daily check-ins, and more.

The name "Guizhong" is inspired by a character from Genshin Impact, embodying intelligence and helpfulness - qualities we strive to achieve with this bot.

## ✨ Features
Guizhong comes packed with a variety of features:

### Music System
- Multi-platform support (YouTube, Spotify, SoundCloud, Apple Music, Vimeo, etc.)
- Complete playback controls (play, pause, skip, queue management)
- Volume control and audio effects
- Lyrics integration
- Music history tracking
- Search with autocomplete

### AI Integration
- Multiple AI models support
- Chat capabilities
- Text generation
- History tracking for conversations
- Real-time voice conversation
- Online search
- Image generation

### Economy & Engagement
- Lottery system
- Daily check-in system
- Server engagement tools

### Administration
- User management tools
- Server configuration
- Customizable commands

<!-- ## 🖼️ Screenshots
<p align="center">
  <img src="assets/screenshots/music_player.png" width="400" alt="Music Player" />
  <img src="assets/screenshots/ai_chat.png" width="400" alt="AI Chat" />
  <img src="assets/screenshots/lottery.png" width="400" alt="Lottery System" />
</p> -->

## 📥 Installation
Follow these steps to get Guizhong up and running:

### Prerequisites
- Node.js (v16.x or higher)
- npm (v7.x or higher)
- Discord bot token
- (Optional) API keys for various services (Genius, OpenAI, etc.)

### Quick Start
1. Clone the repository:
   ```bash
   git clone https://github.com/yuhuanowo/Guizhong.git
   cd Guizhong
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create configuration:
   ```bash
   cp config.example.yml config.yml
   ```

4. Edit the `config.yml` file with your bot token and other settings.

5. Start the bot:
   ```bash
   npm start
   ```

For detailed installation instructions, check our Installation Guide:
- [English](docs/installation.md)
- [简体中文](docs/installation.zh-CN.md)
- [繁體中文](docs/installation.zh-TW.md)

## ⚙️ Configuration
Guizhong can be configured through the `config.yml` file. Here are some key configuration options:

- `token`: Your Discord bot token
- `prefix`: Command prefix for text commands
- `embedColour`: Default color for embeds
- `geniusApiKey`: (Optional) API key for Genius lyrics service
- `youtubeapikey`: (Optional) YouTube API key for enhanced YouTube functionalities
- `openaiApiKey`: (Optional) OpenAI API key for AI functionalities

For a complete configuration guide, check our Configuration Documentation:
- [English](docs/configuration.md)
- [简体中文](docs/configuration.zh-CN.md)
- [繁體中文](docs/configuration.zh-TW.md)

## 🎮 Usage
After installation and configuration, invite the bot to your server using the OAuth2 URL generated from the Discord Developer Portal.

### Basic Commands
- `/play [song name or URL]` - Play a song
- `/pause` - Pause the current song
- `/skip` - Skip to the next song
- `/queue` - View the current song queue
- `/help` - Display the help menu

For a complete list of commands, use the `/help` command or check our Commands Documentation:
- [English](docs/commands.md)
- [简体中文](docs/commands.zh-CN.md)
- [繁體中文](docs/commands.zh-TW.md)

## 🤝 Contributing
Contributions are welcome! Please check our Contributing Guidelines:
- [English](CONTRIBUTING.md)
- [简体中文](CONTRIBUTING_ZH-CN.md)
- [繁體中文](CONTRIBUTING_ZH-TW.md)

## 📚 API Documentation
API documentation for developers is available in:
- [English](docs/api.md)
- [简体中文](docs/api/index.zh-CN.md)
- [繁體中文](docs/api/index.zh-TW.md)

## 🗺️ Roadmap
Check our [TODO.md](TODO.md) file for planned features and improvements.

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements
- All contributors who have helped this project
- [discord.js](https://discord.js.org) for the Discord API wrapper
- [discord-player](https://discord-player.js.org) for the music player
- Other libraries and services that made this bot possible

---

<p align="center">
  Made with ❤️ by YuhuanStudio
  <br>
  <a href="https://discord.gg/GfUY7ynvXN">Join Our Discord</a> | 
  <a href="https://github.com/yuhuanowo/Guizhong">GitHub Repository</a> | 
  <a href="https://www.yuhuanstudio.eu.org/">YuhuanStudio Official Website</a>
  <br>
</p>
