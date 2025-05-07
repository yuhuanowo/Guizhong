const { EmbedBuilder, Colors, AllowedMentionsTypes } = require("discord.js");
const config = require("../../config");
const chatCommand = require("../../commands/LLM/Chat");
const mongoose = require("mongoose");
const ChatLog = mongoose.model("ChatLog");
const logger = require("../../utils/logger");
const { generateText } = require('ai');
const { createGoogleGenerativeAI } = require("@ai-sdk/google");
const google = createGoogleGenerativeAI({
    apiKey: config.googleapikey,
});

module.exports = {
    name: "messageCreate",
    once: false,
    async execute(message, interaction, client) {
        // 处理来自Minecraft服务器的消息
        // 通过DiscordSRV桥接的消息
        if (message.author.bot) {
            // 假设这个ID是DiscordSRV机器人的ID，需要替换为实际ID
            const discordSRVBotId = "984441396679290921";
            
            if (message.author.id === discordSRVBotId) {
                // 使用"!ai"前缀作为触发词
                const triggerPrefix = "!ai";
                
                if (message.content.includes(triggerPrefix)) {
                    // 检查是否包含触发词
                    logger.info("检测到Minecraft AI请求:", message.content);
                    let userPrompt = '';
                    // 处理Minecraft格式的消息, 如 "《主世界》.yuhuanowo8664 » !ai hi"
                    if (message.content.includes('»')) {
                        // 找到 "!ai" 后面的所有内容
                        const aiIndex = message.content.indexOf(triggerPrefix);
                        if (aiIndex !== -1) {
                            userPrompt = message.content.slice(aiIndex + triggerPrefix.length).trim();
                        }
                    } else {
                        // 普通消息处理
                        userPrompt = message.content.slice(message.content.indexOf(triggerPrefix) + triggerPrefix.length).trim();
                    }
                    
                    if (userPrompt.length === 0) return; // 如果没有实际内容则忽略
                    
                    
                    
                    try {
                        // 发送"正在思考"消息
                        // const loadingMessage = await message.channel.send("⏳ AI 正在思考中...");
                        logger.info("提取的用户提示:", userPrompt);
                        userPrompt = userPrompt + "\n\n请注意：此消息来自Minecraft服务器，請你作為伺服器的ai助手幫助玩家進行遊戲,現在版本1.21.4,可支援java跟基岩版進入。內容很可能與Minecraft相關,盡量以簡短的方式回答以避免無法回傳顯示。";
                        // 使用AI SDK生成回复
                        const { text: aiResponse } = await generateText({
                            model: google('gemini-1.5-pro'),
                            prompt: userPrompt,
                            maxTokens: 100,
                        });
                        
                        // 以纯文本形式回复，确保在Minecraft中可以正常显示
                        await message.channel.send(aiResponse);
                        
                    } catch (error) {
                        // 更详细地记录错误信息
                        logger.error("处理Minecraft AI请求时出错:", {
                            message: error.message,
                            stack: error.stack,
                            name: error.name,
                            code: error.code,
                            details: error.details || '无详细信息',
                            prompt: userPrompt
                        });
                        
                        // 向用户显示更具体的错误信息
                        let errorMessage = "AI生成回复时出错：" + error.message;
                        if (error.code) {
                            errorMessage += `\n错误代码: ${error.code}`;
                        }
                        
                        message.channel.send(errorMessage + "\n请稍后再试或联系管理员。");
                    }
                }
            }
            return; // 其他机器人消息不处理
        }

        // 原有的回复逻辑保持不变
        if (message.reference && message.reference.messageId) {
            const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
            if (repliedMessage.author.bot) {
                const interactionId = repliedMessage.id;

                try {
                    const row = await ChatLog.findOne({ interaction_id: interactionId });

                    if (row) {
                        // 建立回覆選項
                        const messageOptions = {
                            embeds: [
                                new EmbedBuilder()
                                    .setTitle("正在生成中...")
                                    .setColor("#3399ff")
                            ],
                            // 新增: 引用原始訊息
                            reply: {
                                messageReference: message.id,
                                failIfNotExists: false,
                                AllowedMentionsTypes: [AllowedMentionsTypes.USER] // 只提及原始訊息的作者 (避免重複提及)
                            }
                        };

                        // 傳送帶有引用的訊息
                        let sentMessage = await message.channel.send(messageOptions);
                        
                        const interaction = {
                            options: {
                                getString: (name) => {
                                    if (name === "text") return message.content;
                                    if (name === "history") return interactionId;
                                    return null;
                                },
                                getAttachment: () => null,
                                getBoolean: () => false,
                            },
                            user: message.author,
                            reply: async (response) => {
                                if (response.embeds && response.embeds[0]) {
                                    await sentMessage.edit({
                                        embeds: [response.embeds[0]],
                                        reply: {
                                            messageReference: message.id,
                                            failIfNotExists: false,
                                            AllowedMentionsTypes: [AllowedMentionsTypes.USER]
                                        }
                                    });
                                } else {
                                    await sentMessage.edit({
                                        content: "無內容",
                                        reply: {
                                            messageReference: message.id,
                                            failIfNotExists: false,
                                            AllowedMentionsTypes: [AllowedMentionsTypes.USER]
                                        }
                                    });
                                }
                            },
                            editReply: async (response) => {
                                if (response.embeds && response.embeds[0]) {
                                    await sentMessage.edit({
                                        embeds: [response.embeds[0]],
                                        reply: {
                                            messageReference: message.id,
                                            failIfNotExists: false,
                                            AllowedMentionsTypes: [AllowedMentionsTypes.USER]
                                        }
                                    });
                                } else {
                                    await sentMessage.edit({
                                        content: "無內容",
                                        reply: {
                                            messageReference: message.id,
                                            failIfNotExists: false,
                                            AllowedMentionsTypes: [AllowedMentionsTypes.USER]
                                        }
                                    });
                                }
                            },
                        };

                        await chatCommand.execute(interaction, sentMessage.id);
                    }
                } catch (err) {
                    console.error("Database error:", err);
                }
            }
        }
    },
};