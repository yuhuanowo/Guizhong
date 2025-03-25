# Guizhong Commands Documentation

This document lists all commands supported by the Guizhong Discord bot in detail, organized by functionality, and provides usage and examples for each command.

## Table of Contents
- [Music Commands](#music-commands)
- [AI and Chat Commands](#ai-and-chat-commands)
- [Lottery System Commands](#lottery-system-commands)
- [Check-in System Commands](#check-in-system-commands)
- [General Commands](#general-commands)
- [Management Commands](#management-commands)
- [Advanced Usage](#advanced-usage)

## Music Commands

### Basic Playback Controls

| Command | Description | Usage | Example |
|---------|-------------|-------|---------|
| `/play` | Play music | `/play [song name or URL]` | `/play Jay Chou Nocturne` |
| `/pause` | Pause current playback | `/pause` | `/pause` |
| `/resume` | Resume playback | `/resume` | `/resume` |
| `/skip` | Skip current song | `/skip` | `/skip` |
| `/stop` | Stop playback and clear queue | `/stop` | `/stop` |
| `/volume` | Adjust volume | `/volume [1-100]` | `/volume 75` |
| `/nowplaying` | Display current playing information | `/nowplaying` | `/nowplaying` |

### Queue Management

| Command | Description | Usage | Example |
|---------|-------------|-------|---------|
| `/queue` | Display play queue | `/queue [page number]` | `/queue 2` |
| `/clear` | Clear play queue | `/clear` | `/clear` |
| `/remove` | Remove specific song | `/remove [position]` | `/remove 3` |
| `/shuffle` | Randomly shuffle queue | `/shuffle` | `/shuffle` |
| `/loop` | Set loop mode | `/loop [off/song/queue]` | `/loop queue` |

### Audio Effects

| Command | Description | Usage | Example |
|---------|-------------|-------|---------|
| `/filter` | Apply audio filter | `/filter [filter name]` | `/filter bassboost` |
| `/8d` | Apply 8D audio effect | `/8d` | `/8d` |
| `/bassboost` | Enhance bass | `/bassboost [level]` | `/bassboost high` |
| `/nightcore` | Apply Nightcore effect | `/nightcore` | `/nightcore` |
| `/vaporwave` | Apply Vaporwave effect | `/vaporwave` | `/vaporwave` |
| `/resetfilters` | Reset all audio effects | `/resetfilters` | `/resetfilters` |

### Other Music Features

| Command | Description | Usage | Example |
|---------|-------------|-------|---------|
| `/lyrics` | Display current song lyrics | `/lyrics [song name(optional)]` | `/lyrics` |
| `/seek` | Jump to specific time point | `/seek [time(seconds)]` | `/seek 120` |
| `/playbili` | Play Bilibili video audio | `/playbili [video URL]` | `/playbili https://www.bilibili.com/video/BV...` |
| `/save` | Save current song information to DM | `/save` | `/save` |

## AI and Chat Commands

### Basic Chat

| Command | Description | Usage | Example |
|---------|-------------|-------|---------|
| `/chat` | Chat with AI | `/chat [model] [text] [history ID(optional)]` | `/chat text:Please introduce traditional Chinese festivals model:03-mini historyId:12345 enablesearch:true image:image.png` |

## Lottery System Commands

| Command | Description | Usage | Example |
|---------|-------------|-------|---------|
| `/buy` | Purchase lottery ticket | `/buy` | `/buy` |
| `/checkticket` | Check your tickets | `/checkticket` | `/checkticket` |
| `/checkallticket` | Check all tickets | `/checkallticket` | `/checkallticket` |
| `/delete` | Delete specific ticket | `/delete [ticket number]` | `/delete 12345` |
| `/deleteall` | Delete all tickets (admin only) | `/deleteall` | `/deleteall` |
| `/draw` | Draw lottery (admin only) | `/draw` | `/draw` |

## Check-in System Commands

| Command | Description | Usage | Example |
|---------|-------------|-------|---------|
| `/checkin` | Daily check-in for rewards | `/checkin` | `/checkin` |

## General Commands

| Command | Description | Usage | Example |
|---------|-------------|-------|---------|
| `/help` | Display help menu | `/help [category(optional)]` | `/help music` |
| `/ping` | Check bot latency | `/ping` | `/ping` |
| `/stats` | Display bot statistics | `/stats` | `/stats` |
| `/botinfo` | Display bot information | `/botinfo` | `/botinfo` |
<!-- | `/invite` | Get bot invite link | `/invite` | `/invite` |
| `/profile` | View profile | `/profile [user(optional)]` | `/profile @user` | -->

## Management Commands

| Command | Description | Usage | Example |
|---------|-------------|-------|---------|
| `/setdjonly` | Set DJ-only mode | `/setdjonly [on/off]` | `/setdjonly on` |
| `/setdj` | Set DJ role | `/setdj [@role]` | `/setdj @DJ` |
| `/ban` | Ban user | `/ban [@user] [reason(optional)]` | `/ban @user violating rules` |
| `/kick` | Kick user | `/kick [@user] [reason(optional)]` | `/kick @user` |
| `/purge` | Bulk delete messages | `/purge [count]` | `/purge 10` |
| `/announce` | Send announcement | `/announce [content]` | `/announce Server will be under maintenance tonight` |

## Advanced Usage

### Command Combination Examples

Here are some examples of command combinations to more efficiently use Guizhong:

1. Play song, adjust volume, and apply audio effect:
   ```
   /play Jay Chou Seven Mile Fragrance
   /volume 70
   /bassboost medium
   ```

2. Create custom playlist:
   ```
   /play Jay Chou Rice Field
   /play JJ Lin River South
   /play Mayday Stubborn
   /queue
   /save
   ```

3. Continuous AI interaction:
   ```
   /chat text:Please introduce traditional Chinese festivals model:03-mini historyId:12345 enablesearch:true image:image.png
   ```

4. Complete lottery system process (admin):
   ```
   # Clear old tickets
   /deleteall
   
   # Users purchase new tickets
   # Wait for enough participants
   
   # Draw lottery
   /draw
   ```

### Emoji and Button Controls

In addition to slash commands, Guizhong also supports music playback control through emojis and buttons on messages:

- ⏯️ - Pause/Resume playback
- ⏭️ - Skip current song
- 🔁 - Toggle loop mode
- 🔀 - Shuffle queue
- 📝 - View lyrics
- ⏹️ - Stop playback

### Frequently Asked Questions

**Q: What should I do if my commands don't respond?**
A: Make sure the Guizhong bot has the correct permissions, and check if you're using the commands in the correct channel.

**Q: How can I see the list of commands I can use?**
A: Use the `/help` command to see all available commands.

**Q: How do I quickly add multiple songs to the queue?**
A: You can use the `/play` command multiple times, or directly add a playlist link, such as `/play https://www.youtube.com/playlist?list=...`.

---

If you have any questions or suggestions regarding commands, please raise them in [GitHub Issues](https://github.com/yuhuanowo/Guizhong/issues) or join our [Discord server](https://discord.gg/GfUY7ynvXN) for help.