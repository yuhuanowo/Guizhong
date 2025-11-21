const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
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

            // 获取使用限制并检查
            const usageLimits = llmService.getModelUsageLimits();
            const usageInfo = llmService.updateUserUsage(message.author.id, session.model, usageLimits);
            
            // 获取线程自动归档时间
            const autoArchiveDuration = session.autoArchive ? 60 : 1440; // 1小时或24小时
            const archiveTime = new Date(Date.now() + autoArchiveDuration * 60 * 1000);

            if (usageInfo.isExceeded) {
                const embed = new EmbedBuilder()
                    .setTitle("💬 AI Chat Session")
                    .setDescription(i18n.getString("commands.agent.usageExceeded", language, {
                        limit: usageInfo.limit,
                        usage: usageInfo.usage,
                        model: session.model
                    }))
                    .setColor("#ff0000");
                await message.reply({ embeds: [embed] });
                return;
            }

            // 显示正在生成的消息
            const generatingEmbed = new EmbedBuilder()
                .setDescription(i18n.getString("commands.agent.generating", language))
                .setColor("#3399ff");
            
            const generatingMessage = await message.reply({ embeds: [generatingEmbed] });

            // 创建LLM客户端
            const client = llmService.createLLMClient(session.model);

            // 构建消息数组，包含会话历史
            let messages = [...session.messages];

            // 格式化用户消息
            const userMessage = await llmService.formatUserMessage(
                message.content, 
                message.attachments.find(att => att.contentType?.startsWith('image/')),
                message.attachments.find(att => att.contentType?.startsWith('audio/')),
                session.model
            );
            messages = [...messages, ...userMessage];

            // 添加系统提示（如果启用）
            if (session.enableSystemPrompt !== false) {
                messages.unshift(llmService.getSystemPrompt(session.model, language));
            }

            // 获取工具定义
            const tools = llmService.getToolDefinitions(session.enableSearch);

            // 发送LLM请求
            let response = await llmService.sendLLMRequest(messages, session.model, tools, client);
            let actuallySearched = false;
            let searchResults = null;
            let dataURI = null;

            // 检查响应状态
            if (response.status !== "200") {
                throw response.body.error;
            }

            // 处理可能的工具调用
            if (
                response.body.choices &&
                response.body.choices[0].finish_reason === "tool_calls"
            ) {
                messages.push(response.body.choices[0].message);
                const calls = response.body.choices[0].message.tool_calls;
                
                // 支持多個工具調用
                if (calls && calls.length > 0) {
                    logger.info(`檢測到 ${calls.length} 個工具調用: ${calls.map(t => t.function.name).join(', ')}`);
                    
                    for (const call of calls) {
                        if (call.type === "function") {
                            const parsed = JSON.parse(call.function.arguments);
                            
                            if (call.function.name === "generateImage") {
                                dataURI = await toolFunctions.generateImageCloudflare(parsed.prompt);
                                messages.push({
                                    tool_call_id: call.id,
                                    role: "tool",
                                    name: call.function.name,
                                    content: JSON.stringify({ generateResult: "已生成提示詞為 " + parsed.prompt + " 的圖片" })
                                });
                            } else if (call.function.name === "searchDuckDuckGo") {
                                actuallySearched = true;
                                
                                const currentSearchResults = await toolFunctions.searchDuckDuckGoLite(parsed.query, parsed.numResults || 10);
                                
                                // 為每個搜尋結果添加搜尋引擎標記
                                const markedResults = currentSearchResults.map(r => ({
                                    ...r,
                                    searchEngine: 'duckduckgo'
                                }));
                                
                                // 合併搜尋結果
                                if (!searchResults) {
                                    searchResults = [];
                                }
                                searchResults = searchResults.concat(markedResults);
                                
                                if (currentSearchResults.length === 0) {
                                    messages.push({
                                        tool_call_id: call.id,
                                        role: "tool",
                                        name: call.function.name,
                                        content: JSON.stringify({ searchResults: "No results found for: " + parsed.query })
                                    });
                                } else {
                                    messages.push({
                                        tool_call_id: call.id,
                                        role: "tool",
                                        name: call.function.name,
                                        content: JSON.stringify({ searchResults: currentSearchResults })
                                    });
                                }
                            } else if (call.function.name === "tavilySearch") {
                                actuallySearched = true;
                                logger.info(`執行 Tavily Search: ${parsed.query}`);
                                
                                try {
                                    const tavilyResults = await toolFunctions.tavilySearch(parsed);
                                    
                                    // 格式化 Tavily 結果以便顯示，並添加搜尋引擎標記
                                    const formattedResults = tavilyResults.results?.map(r => ({
                                        title: r.title,
                                        url: r.url,
                                        contentSnippet: r.content,
                                        domain: new URL(r.url).hostname,
                                        icon: r.favicon || `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(new URL(r.url).hostname)}`,
                                        searchEngine: 'tavily'
                                    })) || [];
                                    
                                    if (!searchResults) {
                                        searchResults = [];
                                    }
                                    searchResults = searchResults.concat(formattedResults);
                                    
                                    // 構建回應內容
                                    let responseContent = {
                                        searchResults: tavilyResults.results || [],
                                        totalResults: tavilyResults.results?.length || 0
                                    };
                                    
                                    // 如果有 LLM 生成的答案，也包含進去
                                    if (tavilyResults.answer) {
                                        responseContent.answer = tavilyResults.answer;
                                    }
                                    
                                    messages.push({
                                        tool_call_id: call.id,
                                        role: "tool",
                                        name: call.function.name,
                                        content: JSON.stringify(responseContent)
                                    });
                                    
                                    logger.success(`Tavily Search 完成，找到 ${formattedResults.length} 個結果`);
                                } catch (error) {
                                    logger.error(`Tavily Search 錯誤: ${error.message}`);
                                    messages.push({
                                        tool_call_id: call.id,
                                        role: "tool",
                                        name: call.function.name,
                                        content: JSON.stringify({ 
                                            error: `Tavily 搜尋失敗: ${error.message}`,
                                            searchResults: []
                                        })
                                    });
                                }
                            } else if (call.function.name === "tavilyExtract") {
                                logger.info(`執行 Tavily Extract: ${Array.isArray(parsed.urls) ? parsed.urls.length : 1} 個 URL`);
                                
                                try {
                                    const extractResults = await toolFunctions.tavilyExtract(parsed);
                                    
                                    messages.push({
                                        tool_call_id: call.id,
                                        role: "tool",
                                        name: call.function.name,
                                        content: JSON.stringify({
                                            success: extractResults.results?.length || 0,
                                            failed: extractResults.failed_results?.length || 0,
                                            results: extractResults.results || [],
                                            failed_results: extractResults.failed_results || []
                                        })
                                    });
                                    
                                    logger.success(`Tavily Extract 完成，成功: ${extractResults.results?.length || 0}, 失敗: ${extractResults.failed_results?.length || 0}`);
                                } catch (error) {
                                    logger.error(`Tavily Extract 錯誤: ${error.message}`);
                                    messages.push({
                                        tool_call_id: call.id,
                                        role: "tool",
                                        name: call.function.name,
                                        content: JSON.stringify({ 
                                            error: `Tavily 提取失敗: ${error.message}`,
                                            results: []
                                        })
                                    });
                                }
                            } else if (call.function.name === "tavilyCrawl") {
                                logger.info(`執行 Tavily Crawl: ${parsed.url}`);
                                
                                try {
                                    const crawlResults = await toolFunctions.tavilyCrawl(parsed);
                                    
                                    messages.push({
                                        tool_call_id: call.id,
                                        role: "tool",
                                        name: call.function.name,
                                        content: JSON.stringify({
                                            base_url: crawlResults.base_url,
                                            totalPages: crawlResults.results?.length || 0,
                                            results: crawlResults.results || []
                                        })
                                    });
                                    
                                    logger.success(`Tavily Crawl 完成，爬取 ${crawlResults.results?.length || 0} 個頁面`);
                                } catch (error) {
                                    logger.error(`Tavily Crawl 錯誤: ${error.message}`);
                                    messages.push({
                                        tool_call_id: call.id,
                                        role: "tool",
                                        name: call.function.name,
                                        content: JSON.stringify({ 
                                            error: `Tavily 爬取失敗: ${error.message}`,
                                            results: []
                                        })
                                    });
                                }
                            } else if (call.function.name === "tavilyMap") {
                                logger.info(`執行 Tavily Map: ${parsed.url}`);
                                
                                try {
                                    const mapResults = await toolFunctions.tavilyMap(parsed);
                                    
                                    messages.push({
                                        tool_call_id: call.id,
                                        role: "tool",
                                        name: call.function.name,
                                        content: JSON.stringify({
                                            base_url: mapResults.base_url,
                                            totalUrls: mapResults.results?.length || 0,
                                            urls: mapResults.results || []
                                        })
                                    });
                                    
                                    logger.success(`Tavily Map 完成，發現 ${mapResults.results?.length || 0} 個 URL`);
                                } catch (error) {
                                    logger.error(`Tavily Map 錯誤: ${error.message}`);
                                    messages.push({
                                        tool_call_id: call.id,
                                        role: "tool",
                                        name: call.function.name,
                                        content: JSON.stringify({ 
                                            error: `Tavily 地圖生成失敗: ${error.message}`,
                                            urls: []
                                        })
                                    });
                                }
                            }
                        }
                    }
                    
                    logger.info(`所有工具調用完成，合併搜尋結果數: ${searchResults?.length || 0}`);
                    
                    // 如果有搜尋調用，使用結果再次發送請求
                    if (actuallySearched) {
                        llmService.updateUserUsage(message.author.id, session.model, usageLimits);

                        response = await llmService.sendLLMRequest(messages, session.model, tools, client);
                        
                        // 處理第二輪可能的工具調用（例如生成圖片）
                        if (
                            response.body.choices &&
                            response.body.choices[0].finish_reason === "tool_calls"
                        ) {
                            messages.push(response.body.choices[0].message);
                            const secondCalls = response.body.choices[0].message.tool_calls;
                            
                            if (secondCalls && secondCalls.length > 0) {
                                for (const call of secondCalls) {
                                    if (call.type === "function") {
                                        const parsed = JSON.parse(call.function.arguments);
                                        if (call.function.name === "generateImage") {
                                            dataURI = await toolFunctions.generateImageCloudflare(parsed.prompt);
                                            messages.push({
                                                tool_call_id: call.id,
                                                role: "tool",
                                                name: call.function.name,
                                                content: JSON.stringify({generateResult: "已生成提示詞為 " + parsed.prompt + " 的圖片"})
                                            });
                                        }
                                    }
                                }
                            }
                        }

                        if (response.status !== "200") {
                            throw response.body.error;
                        }
                    }
                }
            }

            // 获取最终输出文本
            const outputText = response.body.choices[0].message.content;

            // 更新会话历史
            session.messages.push(...userMessage);
            session.messages.push({ role: "assistant", content: outputText });

            // 保持会话历史在合理长度内，使用会话设置的maxMessages
            const maxHistoryLength = (session.maxMessages || 20) * 2; // 每轮对话包含用户和助手消息
            if (session.messages.length > maxHistoryLength) {
                // 保留最近的消息，但确保成对出现
                const messagesToKeep = Math.floor(maxHistoryLength / 2) * 2;
                session.messages = session.messages.slice(-messagesToKeep);
            }

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
                        embed.setDescription(outputText ? outputText : i18n.getString("commands.agent.imageGenerated", language));
                        embed.setFooter({text: `${session.model} with Flux-1 | ${today}：${usageInfo.usage}/${usageInfo.limit} | ${archiveMsg}`});
                        await generatingMessage.edit({ embeds: [embed], files: [imageResult.attachment] });
                        fs.unlinkSync(imageResult.path);
                        return;
                    }
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
                        embed.setDescription(outputText ? outputText : i18n.getString("commands.agent.imageGenerated", language));
                        embed.setFooter({text: `${session.model} with Flux-1 | ${today}：${usageInfo.usage}/${usageInfo.limit} | ${archiveMsg}`});
                        await generatingMessage.edit({ embeds: [embed], files: [imageResult.attachment] });
                        fs.unlinkSync(imageResult.path);
                        return;
                    }
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
                if (actuallySearched) {
                    if (dataURI && dataURI.startsWith("data:image/jpeg;base64,")) {
                        embed.setFooter({
                            text: `${session.model} with Flux-1 | ${today}：${usageInfo.usage}/${usageInfo.limit} | 🔍 ${i18n.getString("commands.agent.search", language)} | ${archiveMsg}`
                        });
                    } else {
                        embed.setFooter({
                            text: `${session.model} | ${today}：${usageInfo.usage}/${usageInfo.limit} | 🔍 ${i18n.getString("commands.agent.search", language)} | ${archiveMsg}`
                        });
                    }
                } else {
                    if (dataURI && dataURI.startsWith("data:image/jpeg;base64,")) {
                        embed.setFooter({
                            text: `${session.model} with Flux-1 | ${today}：${usageInfo.usage}/${usageInfo.limit} | 🔍 ${i18n.getString("commands.agent.searchnotused", language)} | ${archiveMsg}`
                        });
                    } else {
                        embed.setFooter({
                            text: `${session.model} | ${today}：${usageInfo.usage}/${usageInfo.limit} | 🔍 ${i18n.getString("commands.agent.searchnotused", language)} | ${archiveMsg}`
                        });
                    }
                }
            } else {
                if (dataURI && dataURI.startsWith("data:image/jpeg;base64,")) {
                    embed.setFooter({
                        text: `${session.model} with Flux-1 | ${today}：${usageInfo.usage}/${usageInfo.limit} | 🔍 ${i18n.getString("commands.agent.searchdisable", language)} | ${archiveMsg}`
                    });
                } else {
                    embed.setFooter({
                        text: `${session.model} | ${today}：${usageInfo.usage}/${usageInfo.limit} | 🔍 ${i18n.getString("commands.agent.searchdisable", language)} | ${archiveMsg}`
                    });
                }
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
                    usage: response.body?.usage || {
                        prompt_tokens: 0,
                        completion_tokens: 0,
                        total_tokens: 0
                    },
                    options: {
                        enable_search: session.enableSearch,
                        enable_system_prompt: session.enableSystemPrompt
                    },
                    processingTime: Date.now() - startTime
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
