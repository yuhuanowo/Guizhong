const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require("discord.js");
const fs = require("fs");
const logger = require("../../utils/logger.js");
const i18n = require("../../utils/i18n");
const config = require("../../config.js");

// 导入LLM相关模块
const memoryService = require("../../commands/LLM/utils/memoryService");
const llmService = require("../../commands/LLM/utils/llmService");
const toolFunctions = require("../../commands/LLM/utils/toolFunctions");
const { searchResultsCache } = require("../../buttons/showSearchResults");
const { thinkContentCache } = require("../../buttons/showThink");

// 导入Start命令以访问活跃会话
const startCommand = require("../../commands/LLM/Start");

module.exports = {
    name: "messageCreate",
    once: false,
    async execute(message, client) {
        // 忽略机器人消息和系统消息
        if (message.author.bot || message.system) return;

        // 检查是否在活跃的AI聊天线程中
        if (!message.channel.isThread()) return;

        const session = startCommand.getActiveSession(message.channel.id);
        if (!session) return;

        // 检查是否是会话创建者
        if (message.author.id !== session.userId) {
            // 其他用户也可以参与对话，但不计入使用量限制
        }

        const guildId = message.guild.id;
        const language = i18n.getServerLanguage(guildId);
        const startTime = Date.now();

        try {
            // 检查会话是否暂停
            if (startCommand.isSessionPaused(message.channel.id)) {
                const embed = new EmbedBuilder()
                    .setTitle("⏸️ " + i18n.getString("commands.start.sessionPaused", language))
                    .setDescription(i18n.getString("commands.start.sessionPausedDesc", language))
                    .setColor("#ff9900");
                
                await message.reply({ embeds: [embed] });
                return;
            }

            // 更新会话活动时间
            startCommand.updateSessionActivity(message.channel.id);

            // 显示正在生成的消息
            const generatingEmbed = new EmbedBuilder()
                .setDescription(i18n.getString("commands.agent.generating", language))
                .setColor("#3399ff");
            
            const generatingMessage = await message.reply({ embeds: [generatingEmbed] });

            // 调用统一的处理函数
            const result = await llmService.processUserRequest({
                userId: message.author.id,
                prompt: message.content,
                image: message.attachments.find(att => att.contentType?.startsWith('image/')),
                audio: message.attachments.find(att => att.contentType?.startsWith('audio/')),
                modelName: session.model,
                historyMessages: session.messages,
                enableSearch: session.enableSearch,
                enableSystemPrompt: session.enableSystemPrompt !== false,
                language
            });

            // 检查使用限制
            if (!result.success && result.isUsageExceeded) {
                const embed = new EmbedBuilder()
                    .setTitle("💬 AI Chat Session")
                    .setDescription(i18n.getString("commands.agent.usageExceeded", language, {
                        limit: result.usageInfo.limit,
                        usage: result.usageInfo.usage,
                        model: result.modelName
                    }))
                    .setColor("#ff0000");
                await generatingMessage.edit({ embeds: [embed] });
                return;
            }

            if (!result.success) {
                 throw new Error(result.error || "Unknown error during processing");
            }

            // 获取结果数据
            const { 
                outputText, 
                searchResults, 
                dataURI, 
                videoUrl,
                remoteVideoUrl,
                usageInfo,
                actuallySearched,
                toolUsed
            } = result;

            // 更新会话历史
            // 重新构建本次用户消息以存入 session
            const userMessage = await llmService.formatUserMessage(
                message.content, 
                message.attachments.find(att => att.contentType?.startsWith('image/')),
                message.attachments.find(att => att.contentType?.startsWith('audio/')),
                session.model
            );
            session.messages.push(...userMessage);
            session.messages.push({ role: "assistant", content: outputText });

            // 保持会话历史在合理长度内
            const maxHistoryLength = (session.maxMessages || 20) * 2;
            if (session.messages.length > maxHistoryLength) {
                const messagesToKeep = Math.floor(maxHistoryLength / 2) * 2;
                session.messages = session.messages.slice(-messagesToKeep);
            }

            // 获取线程自动归档时间
            const autoArchiveDuration = session.autoArchive ? 60 : 1440; // 1小时或24小时
            const archiveTime = new Date(Date.now() + autoArchiveDuration * 60 * 1000);

            // 创建响应embed
            let embed;
            const today = i18n.getString("commands.agent.today", language);

            // 格式化自动归档时间
            const formatter = new Intl.DateTimeFormat(language === 'zh-CN' ? 'zh-CN' : (language === 'zh-TW' ? 'zh-TW' : 'en-US'), {
                hour: '2-digit',
                minute: '2-digit',
                month: 'short',
                day: 'numeric'
            });
            const formattedArchiveTime = formatter.format(archiveTime);
            
            // 获取自动归档提示语
            const archiveMsg = i18n.getString("commands.agent.archiveTime", language, {
                time: formattedArchiveTime
            }) || `⌛ ${formattedArchiveTime}`;

            // 处理思考模型
            if (["DeepSeek-R1", "o1-mini", "o1", "o3-mini", "o3", "o4-mini"].includes(session.model)) {
                const thinkContent = outputText.match(/<think>([\s\S]*?)<\/think>/);
                const displayText = outputText
                    .replace(/<think>[\s\S]*?<\/think>/g, "")
                    .trim();

                embed = new EmbedBuilder()
                    .setDescription(displayText)
                    .setColor("#00ff00")
                    .setFooter({
                        text: `${session.model} | ${today}：${usageInfo.usage}/${usageInfo.limit} | ${archiveMsg}`
                    });

                // 处理生成的图像
                if (dataURI && dataURI.startsWith("data:image/jpeg;base64,")) {
                    const imageResult = toolFunctions.processGeneratedImage(dataURI);
                    if (imageResult.path) {
                        const filename = "generated_image.jpg";
                        imageResult.attachment.setName(filename);

                        embed.setDescription(outputText ? outputText : i18n.getString("commands.agent.imageGenerated", language));
                        embed.setImage(`attachment://${filename}`);
                        
                        let footerText = `${session.model} | ${today}：${usageInfo.usage}/${usageInfo.limit} | ${archiveMsg}`;
                        if (toolUsed === 'flux') {
                            footerText = `${session.model} with Flux-1 | ${today}：${usageInfo.usage}/${usageInfo.limit} | ${archiveMsg}`;
                        } else if (toolUsed === 'zhipu-cogview') {
                            footerText = `${session.model} with CogView-3 | ${today}：${usageInfo.usage}/${usageInfo.limit} | ${archiveMsg}`;
                        }
                        embed.setFooter({text: footerText});
                        
                        await generatingMessage.edit({ embeds: [embed], files: [imageResult.attachment] });
                        fs.unlinkSync(imageResult.path);
                        return;
                    }
                } else if (videoUrl) {
                    // 處理生成的視頻 - 發送文件
                    embed.setDescription(displayText || i18n.getString("commands.agent.zhipuVideoGenerated", language));
                    const videoAttachment = new AttachmentBuilder(videoUrl);
                    
                    let footerText = `${session.model} with CogVideoX-Flash | ${today}：${usageInfo.usage}/${usageInfo.limit} | ${archiveMsg}`;
                    if (toolUsed === 'zhipu-cogvideo') {
                        footerText = `${session.model} with CogVideoX-Flash | ${today}：${usageInfo.usage}/${usageInfo.limit} | ${archiveMsg}`;
                    }
                    embed.setFooter({text: footerText});
                    
                    await generatingMessage.edit({ embeds: [embed], files: [videoAttachment] });
                    
                    // 删除临时视频文件
                    try { fs.unlinkSync(videoUrl); } catch (e) { logger.warn(`无法删除临时视频 ${videoUrl}: ${e.message}`); }
                    return;
                } else if (dataURI) {
                    logger.error("Invalid dataURI format");
                }

                // 处理思考过程按钮
                const row = new ActionRowBuilder();
                if (thinkContent && thinkContent[1].trim()) {
                    // 存储思考内容到缓存
                    thinkContentCache.set(generatingMessage.id, thinkContent[1]);
                    setTimeout(() => {
                        thinkContentCache.delete(generatingMessage.id);
                    }, 10 * 60 * 1000); // 10分钟后清理缓存
                    
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`showThink_${generatingMessage.id}`)
                            .setLabel(i18n.getString("commands.agent.openThink", language))
                            .setStyle(ButtonStyle.Secondary)
                    );
                }

                // 处理搜索结果按钮
                if (searchResults && searchResults.length > 0) {
                    // 存储搜索结果到缓存
                    searchResultsCache.set(generatingMessage.id, searchResults);
                    setTimeout(() => {
                        searchResultsCache.delete(generatingMessage.id);
                    }, 10 * 60 * 1000); // 10分钟后清理缓存

                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`showSearchResults_${generatingMessage.id}`)
                            .setLabel(i18n.getString("commands.agent.showSearchResults", language))
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji("🔍")
                    );
                }

                // 添加 Open in Web 按钮
                if (config.webUrl) {
                    row.addComponents(
                        new ButtonBuilder()
                            .setLabel(i18n.getString("commands.agent.openInWeb", language))
                            .setStyle(ButtonStyle.Link)
                            .setURL(`${config.webUrl}/chat/${generatingMessage.id}`)
                    );
                }

                await generatingMessage.edit({ 
                    embeds: [embed], 
                    components: row.components.length > 0 ? [row] : [] 
                });

            } else {
                // 处理其他模型的标准响应
                embed = new EmbedBuilder()
                    .setDescription(outputText)
                    .setColor("#00ff00")
                    .setFooter({
                        text: `${session.model} | ${today}：${usageInfo.usage}/${usageInfo.limit} | ${archiveMsg}`
                    });

                // 处理生成的图像
                if (dataURI && dataURI.startsWith("data:image/jpeg;base64,")) {
                    const imageResult = toolFunctions.processGeneratedImage(dataURI);
                    if (imageResult.path) {
                        const filename = "generated_image.jpg";
                        imageResult.attachment.setName(filename);

                        embed.setDescription(outputText ? outputText : i18n.getString("commands.agent.imageGenerated", language));
                        embed.setImage(`attachment://${filename}`);
                        
                        let footerText = `${session.model} | ${today}：${usageInfo.usage}/${usageInfo.limit} | ${archiveMsg}`;
                        if (toolUsed === 'flux') {
                            footerText = `${session.model} with Flux-1 | ${today}：${usageInfo.usage}/${usageInfo.limit} | ${archiveMsg}`;
                        } else if (toolUsed === 'zhipu-cogview') {
                            footerText = `${session.model} with CogView-3 | ${today}：${usageInfo.usage}/${usageInfo.limit} | ${archiveMsg}`;
                        }
                        embed.setFooter({text: footerText});
                        
                        await generatingMessage.edit({ embeds: [embed], files: [imageResult.attachment] });
                        fs.unlinkSync(imageResult.path);
                        return;
                    }
                } else if (videoUrl) {
                    // 處理生成的視頻 - 發送文件
                    embed.setDescription(outputText || i18n.getString("commands.agent.zhipuVideoGenerated", language));
                    const videoAttachment = new AttachmentBuilder(videoUrl);
                    
                    let footerText = `${session.model} with CogVideoX-Flash | ${today}：${usageInfo.usage}/${usageInfo.limit} | ${archiveMsg}`;
                    if (toolUsed === 'zhipu-cogvideo') {
                        footerText = `${session.model} with CogVideoX-Flash | ${today}：${usageInfo.usage}/${usageInfo.limit} | ${archiveMsg}`;
                    }
                    embed.setFooter({text: footerText});
                    
                    await generatingMessage.edit({ embeds: [embed], files: [videoAttachment] });
                    
                    // 删除临时视频文件
                    try { fs.unlinkSync(videoUrl); } catch (e) { logger.warn(`无法删除临时视频 ${videoUrl}: ${e.message}`); }
                    return;
                } else if (dataURI) {
                    logger.error("Invalid dataURI format");
                }

                // 处理搜索结果按钮
                const row = new ActionRowBuilder();
                if (searchResults && searchResults.length > 0) {
                    // 存储搜索结果到缓存
                    searchResultsCache.set(generatingMessage.id, searchResults);
                    setTimeout(() => {
                        searchResultsCache.delete(generatingMessage.id);
                    }, 10 * 60 * 1000); // 10分钟后清理缓存

                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`showSearchResults_${generatingMessage.id}`)
                            .setLabel(i18n.getString("commands.agent.showSearchResults", language))
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji("🔍")
                    );
                }

                // 添加 Open in Web 按钮
                if (config.webUrl) {
                    row.addComponents(
                        new ButtonBuilder()
                            .setLabel(i18n.getString("commands.agent.openInWeb", language))
                            .setStyle(ButtonStyle.Link)
                            .setURL(`${config.webUrl}/chat/${generatingMessage.id}`)
                    );
                }

                await generatingMessage.edit({ 
                    embeds: [embed], 
                    components: row.components.length > 0 ? [row] : [] 
                });
            }

            // 更新搜索状态到footer
            if (session.enableSearch) {
                let toolName = "";
                if (toolUsed === 'flux') toolName = " with Flux-1";
                else if (toolUsed === 'zhipu-cogview') toolName = " with CogView-3";
                else if (toolUsed === 'zhipu-cogvideo') toolName = " with CogVideoX-Flash";
                
                const searchStatus = actuallySearched 
                    ? `🔍 ${i18n.getString("commands.agent.search", language)}` 
                    : `🔍 ${i18n.getString("commands.agent.searchnotused", language)}`;
                    
                embed.setFooter({
                    text: `${session.model}${toolName} | ${today}：${usageInfo.usage}/${usageInfo.limit} | ${searchStatus} | ${archiveMsg}`
                });
            } else {
                let toolName = "";
                if (toolUsed === 'flux') toolName = " with Flux-1";
                else if (toolUsed === 'zhipu-cogview') toolName = " with CogView-3";
                else if (toolUsed === 'zhipu-cogvideo') toolName = " with CogVideoX-Flash";

                embed.setFooter({
                    text: `${session.model}${toolName} | ${today}：${usageInfo.usage}/${usageInfo.limit} | 🔍 ${i18n.getString("commands.agent.searchdisable", language)} | ${archiveMsg}`
                });
            }

            // 保存对话记录到MongoDB
            try {
                const sentMessageId = generatingMessage.id;
                
                // 准备额外数据
                const extraData = {
                    userInfo: {
                        username: message.author.username,
                        avatar_url: message.author.displayAvatarURL(),
                        display_name: message.author.displayName
                    },
                    guildInfo: {
                        name: message.guild.name,
                        id: message.guild.id,
                        icon_url: message.guild.iconURL()
                    },
                    usage: result.tokenUsage || {
                        prompt_tokens: 0,
                        completion_tokens: 0,
                        total_tokens: 0
                    },
                    options: {
                        enable_search: session.enableSearch,
                        enable_system_prompt: session.enableSystemPrompt
                    },
                    processingTime: Date.now() - startTime,
                    searchResults: searchResults,
                    generatedImage: dataURI,
                    generatedVideo: remoteVideoUrl, // 使用遠程 URL 而不是本地路徑，以便網站可以訪問
                    toolUsed: toolUsed
                };

                await memoryService.saveChatLogToMongo(
                    message.author.id,
                    session.model,
                    message.content,
                    outputText,
                    String(sentMessageId),
                    session.lastMessageId || null,
                    extraData
                );

                // 更新 session.lastMessageId
                session.lastMessageId = sentMessageId;
                
                logger.info(`保存对话记录到MongoDB，线程: ${message.channel.id}, 消息ID: ${sentMessageId}`);
                
                // 更新用户的长期记忆
                // await memoryService.updateUserMemory(message.author.id, message.content);
            } catch (mongoError) {
                logger.error("保存对话记录到MongoDB失败:", mongoError);
            }

            // 记录日志
            logger.info(`AI线程回复: ${outputText ? outputText.substring(0, 100) : '(空回复)'}... \t 用户: ${message.author.tag} \t 线程: ${message.channel.id}`);

        } catch (error) {
            console.error("Thread AI response error:", error);
            logger.error("Thread AI response error详细信息:", {
                message: error.message,
                stack: error.stack,
                threadId: message.channel.id,
                user: message.author.tag
            });

            const errorEmbed = new EmbedBuilder()
                .setDescription(i18n.getString("commands.agent.error", language, { 
                    error: error.message 
                }))
                .setColor("#ff0000");

            try {
                await message.reply({ embeds: [errorEmbed] });
            } catch (replyError) {
                console.error("Error replying to thread message:", replyError);
            }
        }
    }
};
