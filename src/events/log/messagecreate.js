const { EmbedBuilder, Colors, AllowedMentionsTypes } = require("discord.js");
const config = require("../../config");
const chatCommand = require("../../commands/LLM/Chat");
const mongoose = require("mongoose");
const ChatLog = mongoose.model("ChatLog");
const logger = require("../../utils/logger");

module.exports = {
    name: "messageCreate",
    once: false,
    async execute(message, interaction, client) {
        if (message.author.bot) return;

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