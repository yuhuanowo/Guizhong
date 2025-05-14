const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
const fs = require("fs");
const logger = require("../../utils/logger");
const i18n = require("../../utils/i18n");
// 存储活跃抽奖的Map，键为消息ID，值为抽奖信息
const activeGiveaways = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName("giveaway")
        .setNameLocalizations({
            "zh-CN": "giveaway",
            "zh-TW": "giveaway"
        })
        .setDescription("Manage giveaways")
        .setDescriptionLocalizations({
            "zh-CN": "管理抽奖活动",
            "zh-TW": "管理抽獎活動"
        })
        .addSubcommand(subcommand =>
            subcommand
                .setName("start")
                .setDescription("Start a giveaway")
        .setDescriptionLocalizations({
            "zh-CN": "开始一个抽奖活动",
            "zh-TW": "開始一個抽獎活動"
        })
                .addStringOption(option =>
                    option
                        .setName("prize")
                        .setNameLocalizations({
                            "zh-CN": "獎品",
                            "zh-TW": "獎品"
                        })
                        .setDescription("Enter the prize")
                        .setDescriptionLocalizations({
                            "zh-CN": "请输入奖品",
                            "zh-TW": "請輸入獎品"
                        })
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName("winners")
                        .setDescription("Number of winners")
                        .setDescriptionLocalizations({
                            "zh-CN": "获奖人数",
                            "zh-TW": "獲獎人數"
                        })
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName("time")
                        .setDescription("Duration in minutes")
                        .setDescriptionLocalizations({
                            "zh-CN": "持续时间（分钟）",
                            "zh-TW": "持續時間（分鐘）"
                        })
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("image")
                        .setNameLocalizations({
                            "zh-CN": "图片",
                            "zh-TW": "圖片"
                        })
                        .setDescription("Enter the image URL")
                        .setDescriptionLocalizations({
                            "zh-CN": "请输入图片链接",
                            "zh-TW": "請輸入圖片連結"
                        })
                        .setRequired(false) 
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("cancel")
                .setDescription("Cancel a giveaway")
        .setDescriptionLocalizations({ 
            "zh-CN": "取消一个抽奖活动",
            "zh-TW": "取消一個抽獎活動"
        })),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        if (subcommand === "cancel") {
            await handleGiveawayCancel(interaction);
        } else if (subcommand === "start") {
            await handleGiveawayStart(interaction);
        }
    },
};

async function handleGiveawayStart(interaction) {
    const prize = interaction.options.getString("prize");
    const winnersCount = interaction.options.getInteger("winners");
    const duration = interaction.options.getInteger("time") * 60; // 将分钟转换为秒
    const endTime = new Date(Date.now() + duration * 1000);
    const imageUrl = interaction.options.getString("image") || "https://cdn.example.com/giveaway.png"; // 使用提供的图片或默认图片
    const guildId = interaction.guild.id;
    const language = i18n.getServerLanguage(guildId);

    const startEmbed = new EmbedBuilder()
        .setTitle(i18n.getString("commands.giveaway.start.title", language))
        .setDescription(i18n.getString("commands.giveaway.start.description", language, {
            prize: prize,
            endTime: Math.floor(endTime.getTime() / 1000)
        }))
        .setColor("#FFC0CB")
        .setThumbnail(imageUrl)
        .setFooter({ text: i18n.getString("commands.giveaway.start.footer", language, { user: interaction.user.tag }) })
        .setTimestamp();

    await interaction.reply({ embeds: [startEmbed] });
    const giveawayMessage = await interaction.fetchReply();
    await giveawayMessage.react("🎉");

    // 保存抽奖信息
    activeGiveaways.set(giveawayMessage.id, {
        prize,
        winnersCount,
        endTime,
        imageUrl,
        creatorId: interaction.user.id,
        messageId: giveawayMessage.id,
        channelId: interaction.channelId,
        guildId: interaction.guildId,
        language: language, // 保存语言设置
        timeoutId: setTimeout(() => endGiveaway(interaction, giveawayMessage.id), duration * 1000)
    });

    logger.info(i18n.getString("commands.giveaway.log.created", language, { user: interaction.user.tag, prize: prize, id: giveawayMessage.id }));
}

async function handleGiveawayCancel(interaction) {
    const guildId = interaction.guild.id;
    const language = i18n.getServerLanguage(guildId);
    
    // 过滤出该用户创建的抽奖
    const userGiveaways = [...activeGiveaways.entries()]
        .filter(([_, giveaway]) => giveaway.creatorId === interaction.user.id);
    
    if (userGiveaways.length === 0) {
        return interaction.reply({ 
            content: i18n.getString("commands.giveaway.cancel.noActiveGiveaways", language), 
            ephemeral: true 
        });
    }

    if (userGiveaways.length === 1) {
        // 只有一个抽奖，直接取消
        const [messageId, giveaway] = userGiveaways[0];
        await cancelGiveaway(interaction, messageId, true);
    } else {
        // 有多个抽奖，让用户选择
        const options = userGiveaways.map(([messageId, giveaway]) => ({
            label: i18n.getString("commands.giveaway.cancel.optionLabel", language, {
                prize: giveaway.prize, 
                endTime: formatDate(giveaway.endTime)
            }),
            value: messageId,
            description: i18n.getString("commands.giveaway.cancel.optionDescription", language, {
                prize: giveaway.prize.substring(0, 30) + (giveaway.prize.length > 30 ? '...' : '')
            }),
        }));

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('cancel-giveaway')
                .setPlaceholder(i18n.getString("commands.giveaway.cancel.selectPlaceholder", language))
                .addOptions(options)
        );

        await interaction.reply({
            content: i18n.getString("commands.giveaway.cancel.selectPrompt", language),
            components: [row],
            ephemeral: true
        });

        // 收集用户的选择
        const filter = i => i.customId === 'cancel-giveaway' && i.user.id === interaction.user.id;
        try {
            const response = await interaction.channel.awaitMessageComponent({ filter, time: 30000 });
            const selectedMessageId = response.values[0];
            await cancelGiveaway(interaction, selectedMessageId, false, response);
        } catch (error) {
            await interaction.editReply({ 
                content: i18n.getString("commands.giveaway.cancel.timeout", language), 
                components: [], 
                ephemeral: true 
            });
        }
    }
}

async function cancelGiveaway(interaction, messageId, isDirectCancel = true, selectResponse = null) {
    const giveaway = activeGiveaways.get(messageId);
    if (!giveaway) {
        const reply = isDirectCancel ? interaction.reply : interaction.editReply;
        const language = i18n.getServerLanguage(interaction.guild.id);
        return reply.call(interaction, { 
            content: i18n.getString("commands.giveaway.cancel.notFound", language), 
            ephemeral: true 
        });
    }

    // 使用保存的语言或服务器语言
    const language = giveaway.language || i18n.getServerLanguage(interaction.guild.id);

    // 清除定时器
    clearTimeout(giveaway.timeoutId);
    
    try {
        // 获取原始抽奖消息并编辑
        const channel = await interaction.client.channels.fetch(giveaway.channelId);
        const message = await channel.messages.fetch(messageId);
        
        const cancelEmbed = new EmbedBuilder()
            .setTitle(i18n.getString("commands.giveaway.cancel.embedTitle", language))
            .setDescription(i18n.getString("commands.giveaway.cancel.embedDescription", language, {
                prize: giveaway.prize,
                user: interaction.user.tag
            }))
            .setColor("#FF0000")
            .setThumbnail(giveaway.imageUrl)
            .setFooter({ text: i18n.getString("commands.giveaway.cancel.embedFooter", language) })
            .setTimestamp();
        
        await message.edit({ embeds: [cancelEmbed] });
        
        // 移除抽奖数据
        activeGiveaways.delete(messageId);
        
        // 回复用户
        const responseContent = i18n.getString("commands.giveaway.cancel.success", language, {
            prize: giveaway.prize
        });
        
        if (selectResponse) {
            await selectResponse.update({ content: responseContent, components: [], ephemeral: true });
        } else if (isDirectCancel) {
            await interaction.reply({ content: responseContent, ephemeral: true });
        } else {
            await interaction.editReply({ content: responseContent, components: [], ephemeral: true });
        }
        
        logger.info(i18n.getString("commands.giveaway.log.cancelled", language, { 
            user: interaction.user.tag, 
            prize: giveaway.prize, 
            id: messageId 
        }));
    } catch (error) {
        logger.error(`${i18n.getString("commands.giveaway.log.cancelError", language)}: ${error.message}`);
        const reply = isDirectCancel ? interaction.reply : interaction.editReply;
        reply.call(interaction, { 
            content: i18n.getString("commands.giveaway.cancel.error", language), 
            ephemeral: true 
        });
    }
}

async function endGiveaway(interaction, messageId) {
    const giveaway = activeGiveaways.get(messageId);
    if (!giveaway) return;
    
    // 使用保存的语言或默认语言
    const language = i18n.getServerLanguage(interaction.guild.id);
    
    logger.info(i18n.getString("commands.giveaway.log.ending", language));
    
    try {
        const channel = await interaction.client.channels.fetch(giveaway.channelId);
        const msg = await channel.messages.fetch(messageId);
        const reaction = msg.reactions.cache.get("🎉");
        const users = await reaction.users.fetch();
        const usersArray = Array.from(users.values()).filter((u) => !u.bot); // 排除机器人用户
        
        if (usersArray.length === 0) {
            logger.info(i18n.getString("commands.giveaway.log.noParticipants", language));
            const noWinnerEmbed = new EmbedBuilder()
                .setTitle(i18n.getString("commands.giveaway.end.title", language))
                .setDescription(i18n.getString("commands.giveaway.end.noWinners", language, {
                    prize: giveaway.prize
                }))
                .setColor("#FFD700")
                .setThumbnail(giveaway.imageUrl)
                .setFooter({ text: i18n.getString("commands.giveaway.end.footer", language) })
                .setTimestamp();
            
            await channel.send({ embeds: [noWinnerEmbed] });
        } else {
            const actualWinnersCount = Math.min(usersArray.length, giveaway.winnersCount);
            const shuffled = usersArray.sort(() => 0.5 - Math.random());
            const winners = shuffled.slice(0, actualWinnersCount);
            
            const resultEmbed = new EmbedBuilder()
                .setTitle(i18n.getString("commands.giveaway.end.title", language))
                .setDescription(i18n.getString("commands.giveaway.end.description", language, {
                    prize: giveaway.prize,
                    winners: winners.map((w) => `<@${w.id}>`).join(i18n.getString("commands.giveaway.end.winnersSeparator", language))
                }))
                .setColor("#FFD700")
                .setThumbnail(giveaway.imageUrl)
                .setFooter({ text: i18n.getString("commands.giveaway.end.footer", language) })
                .setTimestamp();
            
            await channel.send({ embeds: [resultEmbed] });
            
            // 私信中獎者
            for (const winner of winners) {
                try {
                    const dmEmbed = new EmbedBuilder()
                        .setTitle(i18n.getString("commands.giveaway.dm.title", language))
                        .setDescription(i18n.getString("commands.giveaway.dm.description", language, {
                            prize: giveaway.prize
                        }))
                        .setColor("#FFD700")
                        .setThumbnail(giveaway.imageUrl)
                        .addFields(
                            { 
                                name: i18n.getString("commands.giveaway.dm.prizeField", language), 
                                value: `**${giveaway.prize}**`, 
                                inline: false 
                            },
                            { 
                                name: i18n.getString("commands.giveaway.dm.serverField", language), 
                                value: channel.guild.name, 
                                inline: true 
                            },
                            { 
                                name: i18n.getString("commands.giveaway.dm.linkField", language), 
                                value: i18n.getString("commands.giveaway.dm.linkValue", language, {
                                    guildId: channel.guild.id,
                                    channelId: channel.id
                                }), 
                                inline: true 
                            }
                        )
                        .setFooter({ text: i18n.getString("commands.giveaway.dm.footer", language) })
                        .setTimestamp();
                    
                    await winner.send({ embeds: [dmEmbed] });
                } catch (error) {
                    logger.error(i18n.getString("commands.giveaway.log.dmError", language, {
                        user: winner.tag || winner.username
                    }));
                }
            }
        }
        
        // 从活跃抽奖中移除
        activeGiveaways.delete(messageId);
    } catch (error) {
        logger.error(`${i18n.getString("commands.giveaway.log.endError", language)}: ${error.message}`);
    }
}

function formatDate(date) {
    return `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())} ${padZero(date.getHours())}:${padZero(date.getMinutes())}`;
}

function padZero(num) {
    return num.toString().padStart(2, '0');
}