# 歸終命令文档（简体中文版）

本文档详细列出了歸終Discord机器人支持的所有命令，按功能分类组织，并提供了每个命令的用法和示例。

## 目录
- [音乐命令](#音乐命令)
- [AI和聊天命令](#ai和聊天命令)
- [抽奖系统命令](#抽奖系统命令)
- [签到系统命令](#签到系统命令)
- [通用命令](#通用命令)
- [管理命令](#管理命令)
- [高级用法](#高级用法)

## 音乐命令

### 基本播放控制

| 命令 | 描述 | 用法 | 示例 |
|-----|------|-----|------|
| `/play` | 播放音乐 | `/play [歌曲名称或URL]` | `/play 周杰伦 稻香` |
| `/pause` | 暂停当前播放 | `/pause` | `/pause` |
| `/resume` | 恢复播放 | `/resume` | `/resume` |
| `/skip` | 跳过当前歌曲 | `/skip` | `/skip` |
| `/stop` | 停止播放并清空队列 | `/stop` | `/stop` |
| `/volume` | 调整音量 | `/volume [1-100]` | `/volume 75` |
| `/nowplaying` | 显示当前播放信息 | `/nowplaying` | `/nowplaying` |

### 队列管理

| 命令 | 描述 | 用法 | 示例 |
|-----|------|-----|------|
| `/queue` | 显示播放队列 | `/queue [页码]` | `/queue 2` |
| `/clear` | 清空播放队列 | `/clear` | `/clear` |
| `/remove` | 移除特定歌曲 | `/remove [位置]` | `/remove 3` |
| `/shuffle` | 随机打乱队列 | `/shuffle` | `/shuffle` |
| `/loop` | 设置循环模式 | `/loop [off/song/queue]` | `/loop queue` |

### 音频效果

| 命令 | 描述 | 用法 | 示例 |
|-----|------|-----|------|
| `/filter` | 应用音频滤镜 | `/filter [滤镜名称]` | `/filter bassboost` |
| `/8d` | 应用8D音效 | `/8d` | `/8d` |
| `/bassboost` | 增强低音 | `/bassboost [级别]` | `/bassboost high` |
| `/nightcore` | 应用Nightcore效果 | `/nightcore` | `/nightcore` |
| `/vaporwave` | 应用Vaporwave效果 | `/vaporwave` | `/vaporwave` |
| `/resetfilters` | 重置所有音频效果 | `/resetfilters` | `/resetfilters` |

### 其他音乐功能

| 命令 | 描述 | 用法 | 示例 |
|-----|------|-----|------|
| `/lyrics` | 显示当前歌曲歌词 | `/lyrics [歌曲名(可选)]` | `/lyrics` |
| `/seek` | 跳到特定时间点 | `/seek [时间(秒)]` | `/seek 120` |
| `/playbili` | 播放哔哩哔哩视频音频 | `/playbili [视频URL]` | `/playbili https://www.bilibili.com/video/BV...` |
| `/save` | 保存当前歌曲信息到私信 | `/save` | `/save` |

## AI和聊天命令

### 基础聊天

| 命令 | 描述 | 用法 | 示例 |
|-----|------|-----|------|
| `/chat` | 与AI聊天 | `/chat [模型] [文本] [历史ID(可选)]` | `/chat text:请介绍一下中国的传统节日 model:03-mini historyId:12345 enablesearch:true image:image.png ` |

## 抽奖系统命令

| 命令 | 描述 | 用法 | 示例 |
|-----|------|-----|------|
| `/buy` | 购买彩票 | `/buy` | `/buy` |
| `/checkticket` | 查看你的彩票 | `/checkticket` | `/checkticket` |
| `/checkallticket` | 查看所有彩票 | `/checkallticket` | `/checkallticket` |
| `/delete` | 删除特定彩票 | `/delete [彩票号码]` | `/delete 12345` |
| `/deleteall` | 删除所有彩票(管理员用) | `/deleteall` | `/deleteall` |
| `/draw` | 抽奖(管理员用) | `/draw` | `/draw` |

## 签到系统命令

| 命令 | 描述 | 用法 | 示例 |
|-----|------|-----|------|
| `/checkin` | 每日签到获取奖励 | `/checkin` | `/checkin` |

## 通用命令

| 命令 | 描述 | 用法 | 示例 |
|-----|------|-----|------|
| `/help` | 显示帮助菜单 | `/help [分类(可选)]` | `/help music` |
| `/ping` | 检查机器人延迟 | `/ping` | `/ping` |
| `/stats` | 显示机器人统计信息 | `/stats` | `/stats` |
| `/botinfo` | 显示机器人信息 | `/botinfo` | `/botinfo` |
<!-- | `/invite` | 获取机器人邀请链接 | `/invite` | `/invite` |
| `/profile` | 查看个人资料 | `/profile [用户(可选)]` | `/profile @用户` | -->

## 管理命令

| 命令 | 描述 | 用法 | 示例 |
|-----|------|-----|------|
| `/setdjonly` | 设置DJ专属模式 | `/setdjonly [开/关]` | `/setdjonly on` |
| `/setdj` | 设置DJ角色 | `/setdj [@角色]` | `/setdj @DJ` |
| `/ban` | 禁止用户 | `/ban [@用户] [原因(可选)]` | `/ban @用户 违反规则` |
| `/kick` | 踢出用户 | `/kick [@用户] [原因(可选)]` | `/kick @用户` |
| `/purge` | 批量删除消息 | `/purge [数量]` | `/purge 10` |
| `/announce` | 发送公告 | `/announce [内容]` | `/announce 服务器将在今晚维护` |

## 高级用法

### 命令组合示例

以下是一些组合命令的示例，展示如何更高效地使用歸終：

1. 播放歌曲、调整音量并应用音效：
   ```
   /play 周杰伦 七里香
   /volume 70
   /bassboost medium
   ```

2. 创建自定义播放列表：
   ```
   /play 周杰伦 稻香
   /play 林俊杰 江南
   /play 五月天 倔强
   /queue
   /save
   ```

3. AI对话连续互动：
   ```
   /chat text:请介绍一下中国的传统节日 model:03-mini historyId:12345 enablesearch:true image:image.png
   ```

4. 抽奖系统完整流程(管理员)：
   ```
   # 清空旧彩票
   /deleteall
   
   # 用户购买新彩票
   # 等待足够用户参与
   
   # 进行抽奖
   /draw
   ```

### 表情符号和按钮控制

除了斜杠命令外，歸終还支持通过消息上的表情符号和按钮来控制音乐播放：

- ⏯️ - 暂停/恢复播放
- ⏭️ - 跳过当前歌曲
- 🔁 - 切换循环模式
- 🔀 - 随机播放队列
- 📝 - 查看歌词
- ⏹️ - 停止播放

### 常见问题解答

**问：我的命令没有响应怎么办？**
答：确保歸終机器人有正确的权限，并检查是否在正确的频道中使用命令。

**问：如何查看我可以使用的命令列表？**
答：使用`/help`命令可以查看所有可用命令。

**问：如何快速添加多首歌曲到队列？**
答：可以使用`/play`命令多次添加，或者直接添加播放列表链接，如`/play https://www.youtube.com/playlist?list=...`。

---

如果您有任何关于命令的问题或建议，请在[GitHub Issues](https://github.com/yuhuanowo/Guizhong/issues)中提出，或加入我们的[Discord服务器](https://discord.gg/GfUY7ynvXN)寻求帮助。