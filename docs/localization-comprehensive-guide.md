# Guizhong 音乐机器人本地化综合指南

## 目录

- [概述](#概述)
- [本地化系统架构](#本地化系统架构)
- [本地化实施进度](#本地化实施进度)
- [添加本地化命令的方法](#添加本地化命令的方法)
- [自动化工具](#自动化工具)
- [本地化覆盖率](#本地化覆盖率)
- [后续工作与规划](#后续工作与规划)
- [语言支持](#语言支持)

## 概述

Guizhong Discord 音乐机器人支持多语言本地化，目前包括英语、简体中文和繁体中文。本地化系统允许机器人根据服务器设置的语言环境，向用户展示对应语言的命令名称、描述和选项说明。本文档汇总了所有与本地化相关的资料，供开发者和贡献者参考。

通过近期的一系列更新，Guizhong 机器人已经实现了对所有命令的完整本地化支持，主要工作包括为每个命令添加 `setNameLocalizations()` 和 `setDescriptionLocalizations()` 功能，以及为命令选项添加本地化描述。

## 本地化系统架构

### 目录结构

本地化文件存储在 `src/locales/` 目录中：

- `en.json`: 英语翻译
- `zh-CN.json`: 简体中文翻译
- `zh-TW.json`: 繁体中文翻译

### 基本用法

本地化系统由 `src/utils/i18n.js` 文件提供支持，主要包含以下功能：

1. **获取服务器语言偏好**:

```javascript
const language = i18n.getServerLanguage(guildId);
```

2. **设置服务器语言偏好**:

```javascript
i18n.setServerLanguage(guildId, "zh-CN");
```

3. **获取翻译字符串**:

```javascript
// 基本用法
const translatedString = i18n.getString("commands.play.notPlaying", language);

// 带参数的用法
const translatedString = i18n.getString("commands.volume.success", language, { volume: 50 });
```

### 命令本地化示例

以下是在命令文件中使用本地化系统的标准模式：

```javascript
const i18n = require("../../utils/i18n");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("command")
        .setNameLocalizations({
            "zh-CN": "命令",
            "zh-TW": "命令"
        })
        .setDescription("Command description")
        .setDescriptionLocalizations({
            "zh-CN": "命令描述",
            "zh-TW": "命令描述"
        }),
    async execute(interaction) {
        // 获取服务器语言偏好
        const guildId = interaction.guild.id;
        const language = i18n.getServerLanguage(guildId);
        
        // 使用本地化字符串
        embed.setTitle(i18n.getString("commands.command.title", language));
    }
}
```

### 字符串替换

本地化系统支持字符串替换，可以在翻译中使用占位符：

```json
{
  "commands": {
    "play": {
      "success": "正在播放: {title}"
    }
  }
}
```

然后在代码中提供替换值：

```javascript
i18n.getString("commands.play.success", language, { title: songTitle });
```

## 本地化实施进度

### 已完成项目

1. **核心本地化系统**
   - 创建了本地化基础架构 (`src/utils/i18n.js`)
   - 实现了多语言支持（英语、简体中文、繁体中文）
   - 添加了服务器语言偏好存储和检索功能
   - 实现了字符串替换功能，支持动态内容

2. **命令本地化**
   - 完成了按钮处理程序的本地化
     - `shuffle.js` - 随机播放按钮
     - `songLyrics.js` - 歌词按钮
   - 完成了事件处理程序的本地化
     - `connectionError.js` - 连接错误事件
   - 完成了所有播放器命令的本地化，包括：
     - `play.js` - 播放音乐
     - `pause.js` - 暂停播放
     - `resume.js` - 继续播放
     - `stop.js` - 停止播放
     - `skip.js` - 跳过当前歌曲
     - `back.js` - 返回上一首歌曲
     - `clear.js` - 清除播放队列
     - `volume.js` - 调整音量
     - `loop.js` - 循环播放
     - `seek.js` - 快进/快退
     - `shuffle.js` - 随机播放
     - `nowplaying.js` - 显示当前播放内容
     - `playnext.js` - 将歌曲添加到队列前面
     - `playshuffle.js` - 随机播放列表
     - `playBili.js` - 播放B站视频
     - `save.js` - 保存当前歌曲

3. **命令注册系统改进**
   - 更新了 `handleCommands.js` 以支持命令描述和选项的本地化
   - 添加了命令选项描述的本地化支持

4. **语言切换功能**
   - 添加了 `/language` 命令，允许用户切换服务器语言偏好

5. **文档**
   - 创建了详细的本地化系统文档（英文和中文版）

### 完成情况

- **命令数量**：50个
- **本地化名称覆盖率**：100%
- **本地化描述覆盖率**：100%
- **命令选项本地化覆盖率**：100%

## 添加本地化命令的方法

### 交互式命令行工具

我们提供了一个交互式命令行工具，简化添加支持多语言的新命令的过程：

```bash
node scripts/create-localized-command.js
```

交互式步骤包括：

1. 输入命令名称（英文）
2. 输入简体中文命令名称（可选）
3. 输入繁体中文命令名称（可选）
4. 输入命令描述（英文）
5. 输入简体中文命令描述
6. 输入繁体中文命令描述
7. 添加选项（如果需要）
8. 选择命令类别

### 手动添加本地化

如果需要手动添加本地化，可以按照以下步骤：

1. 使用 `setNameLocalizations()` 设置命令名称的本地化版本
2. 使用 `setDescriptionLocalizations()` 设置命令描述的本地化版本
3. 使用选项的 `setDescriptionLocalizations()` 设置命令选项描述的本地化版本

## 自动化工具

为了提高效率，我们开发了以下自动化脚本：

1. `add-localization.js` - 为所有命令添加名称和描述本地化
2. `add-option-localization.js` - 为命令选项添加本地化描述
3. `merge-locales.js` - 合并本地化字符串
4. `merge-missing-options.js` - 补充缺失的选项本地化字符串
5. `localization-summary.js` - 生成本地化报告
6. `check-localization.js` - 检查未本地化的字符串
7. `create-localized-command.js` - 创建具有本地化支持的新命令

## 本地化覆盖率

根据最新的本地化报告：

- 总命令数: 50
- 已本地化名称的命令: 50 (100%)
- 已本地化描述的命令: 50 (100%)
- 命令选项总数: 17
- 已本地化的选项: 66 (388%)

所有命令都已完成本地化，没有缺少本地化的命令。

## 后续工作与规划

### 本地化系统优化

1. **完善检测工具**
   - 增强 `scripts/check-localization.js` 脚本功能
   - 添加自动检测未本地化字符串的功能
   - 添加翻译一致性检查

2. **支持更多语言**
   - 准备扩展至其他语言（如日语、韩语等）的基础设施
   - 创建语言文件模板系统

### 测试计划

1. **功能测试**
   - 测试所有已本地化命令在各种语言环境下的功能
   - 验证字符串替换（如 `{title}`）是否正常工作
   - 测试语言切换功能的可靠性

2. **边缘情况**
   - 测试缺失翻译的回退机制
   - 测试服务器首次使用时的默认语言
   - 测试特殊字符和长字符串的显示情况

### 持续维护

1. **持续维护**：随着新命令的添加，确保添加适当的本地化支持
2. **用户测试**：在不同语言环境下测试命令显示效果
3. **完善翻译**：根据用户反馈持续改进翻译质量
4. **添加更多语言**：考虑添加更多语言支持，如日语、韩语等

## 语言支持

目前支持的语言：

- 英文 (en) - 默认语言
- 简体中文 (zh-CN)
- 繁体中文 (zh-TW)

## 总结

通过一系列更新，Guizhong 音乐机器人已具备完整的多语言支持，能够为不同语言的用户提供更好的使用体验。用户可以根据服务器设置的语言环境，看到对应语言的命令名称、描述和选项说明。

本地化系统的实现采用了分阶段推进的方法，优先处理最常用的命令和功能。这种方法确保即使在完全完成之前，用户也能体验到主要的本地化改进。目前，所有核心音乐功能和命令都已完成本地化，为不同语言用户提供了一致的体验。
