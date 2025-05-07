const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
const fs = require("fs");
const logger = require("../../utils/logger");

// 存储活跃抽奖的Map，键为消息ID，值为抽奖信息
const activeGiveaways = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName("giveaway")
        .setDescription("管理抽獎活動")
        .addSubcommand(subcommand =>
            subcommand
                .setName("start")
                .setDescription("開始一個抽獎活動")
                .addStringOption(option =>
                    option
                        .setName("獎品")
                        .setDescription("請輸入獎品資訊")
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName("winners")
                        .setDescription("得獎者數量")
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName("time")
                        .setDescription("持續時間（分鐘）")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("圖片")
                        .setDescription("請輸入圖片的 URL")
                        .setRequired(false) 
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("cancel")
                .setDescription("取消你創建的抽獎活動")
        ),

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
    const prize = interaction.options.getString("獎品");
    const winnersCount = interaction.options.getInteger("winners");
    const duration = interaction.options.getInteger("time") * 60; // 将分钟转换为秒
    const endTime = new Date(Date.now() + duration * 1000);
    const imageUrl = interaction.options.getString("圖片") || "https://cdn.example.com/giveaway.png"; // 使用提供的图片或默认图片

    const startEmbed = new EmbedBuilder()
        .setTitle("🎉 抽獎開始！")
        .setDescription(`獎品：**${prize}**\n點擊 🎉 來參加！\n剩餘時間：<t:${Math.floor(endTime.getTime() / 1000)}:R>。`)
        .setColor("#FFC0CB")
        .setThumbnail(imageUrl)
        .setFooter({ text: `由 ${interaction.user.tag} 創建` })
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
        timeoutId: setTimeout(() => endGiveaway(interaction, giveawayMessage.id), duration * 1000)
    });

    logger.info(`用戶 ${interaction.user.tag} 創建了抽獎: ${prize}, ID: ${giveawayMessage.id}`);
}

async function handleGiveawayCancel(interaction) {
    // 过滤出该用户创建的抽奖
    const userGiveaways = [...activeGiveaways.entries()]
        .filter(([_, giveaway]) => giveaway.creatorId === interaction.user.id);
    
    if (userGiveaways.length === 0) {
        return interaction.reply({ content: "你沒有任何進行中的抽獎活動", ephemeral: true });
    }

    if (userGiveaways.length === 1) {
        // 只有一个抽奖，直接取消
        const [messageId, giveaway] = userGiveaways[0];
        await cancelGiveaway(interaction, messageId, true);
    } else {
        // 有多个抽奖，让用户选择
        const options = userGiveaways.map(([messageId, giveaway]) => ({
            label: `${giveaway.prize} (结束于 ${formatDate(giveaway.endTime)})`,
            value: messageId,
            description: `獎品: ${giveaway.prize.substring(0, 30)}${giveaway.prize.length > 30 ? '...' : ''}`,
        }));

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('cancel-giveaway')
                .setPlaceholder('選擇要取消的抽獎')
                .addOptions(options)
        );

        await interaction.reply({
            content: "請選擇你要取消的抽獎:",
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
            await interaction.editReply({ content: "選擇超時或發生錯誤", components: [], ephemeral: true });
        }
    }
}

async function cancelGiveaway(interaction, messageId, isDirectCancel = true, selectResponse = null) {
    const giveaway = activeGiveaways.get(messageId);
    if (!giveaway) {
        const reply = isDirectCancel ? interaction.reply : interaction.editReply;
        return reply.call(interaction, { content: "找不到該抽獎活動或已經結束", ephemeral: true });
    }

    // 清除定时器
    clearTimeout(giveaway.timeoutId);
    
    try {
        // 获取原始抽奖消息并编辑
        const channel = await interaction.client.channels.fetch(giveaway.channelId);
        const message = await channel.messages.fetch(messageId);
        
        const cancelEmbed = new EmbedBuilder()
            .setTitle("❌ 抽獎已取消")
            .setDescription(`獎品：**${giveaway.prize}**\n抽獎已被 ${interaction.user.tag} 取消。`)
            .setColor("#FF0000")
            .setThumbnail(giveaway.imageUrl)
            .setFooter({ text: "抽獎已取消" })
            .setTimestamp();
        
        await message.edit({ embeds: [cancelEmbed] });
        
        // 移除抽奖数据
        activeGiveaways.delete(messageId);
        
        // 回复用户
        const responseContent = `抽獎 "${giveaway.prize}" 已成功取消`;
        
        if (selectResponse) {
            await selectResponse.update({ content: responseContent, components: [], ephemeral: true });
        } else if (isDirectCancel) {
            await interaction.reply({ content: responseContent, ephemeral: true });
        } else {
            await interaction.editReply({ content: responseContent, components: [], ephemeral: true });
        }
        
        logger.info(`用戶 ${interaction.user.tag} 取消了抽獎: ${giveaway.prize}, ID: ${messageId}`);
    } catch (error) {
        logger.error(`取消抽獎時發生錯誤: ${error.message}`);
        const reply = isDirectCancel ? interaction.reply : interaction.editReply;
        reply.call(interaction, { content: "取消抽獎時發生錯誤，請稍後再試", ephemeral: true });
    }
}

async function endGiveaway(interaction, messageId) {
    const giveaway = activeGiveaways.get(messageId);
    if (!giveaway) return;
    
    logger.info("計時器結束，開始抽獎");
    
    try {
        const channel = await interaction.client.channels.fetch(giveaway.channelId);
        const msg = await channel.messages.fetch(messageId);
        const reaction = msg.reactions.cache.get("🎉");
        const users = await reaction.users.fetch();
        const usersArray = Array.from(users.values()).filter((u) => !u.bot); // 排除機器人用戶
        
        if (usersArray.length === 0) {
            logger.info("沒有任何人參與抽獎");
            const noWinnerEmbed = new EmbedBuilder()
                .setTitle("🎉 抽獎結束！")
                .setDescription(`獎品：**${giveaway.prize}**\n沒有任何人參與抽獎。`)
                .setColor("#FFD700")
                .setThumbnail(giveaway.imageUrl)
                .setFooter({ text: "感謝大家的參與！" })
                .setTimestamp();
            
            await channel.send({ embeds: [noWinnerEmbed] });
        } else {
            const actualWinnersCount = Math.min(usersArray.length, giveaway.winnersCount);
            const shuffled = usersArray.sort(() => 0.5 - Math.random());
            const winners = shuffled.slice(0, actualWinnersCount);
            
            const resultEmbed = new EmbedBuilder()
                .setTitle("🎉 抽獎結束！")
                .setDescription(
                    `獎品：**${giveaway.prize}**\n` +
                    `得獎者：${winners.map((w) => `<@${w.id}>`).join("， ")}`
                )
                .setColor("#FFD700")
                .setThumbnail(giveaway.imageUrl)
                .setFooter({ text: "感謝大家的參與！" })
                .setTimestamp();
            
            await channel.send({ embeds: [resultEmbed] });
            
            // 私信中獎者
            for (const winner of winners) {
                try {
                    const dmEmbed = new EmbedBuilder()
                        .setTitle("🎉 恭喜你！")
                        .setDescription(`你在抽獎活動中贏得了 **${giveaway.prize}**。請聯繫管理員領取你的獎品。`)
                        .setColor("#FFD700")
                        .setThumbnail(giveaway.imageUrl)
                        .addFields(
                            { name: "獎品", value: `**${giveaway.prize}**`, inline: false },
                            { name: "群組名稱", value: channel.guild.name, inline: true },
                            { name: "傳送連結", value: `[點擊這裡](https://discord.com/channels/${channel.guild.id}/${channel.id})`, inline: true }
                        )
                        .setFooter({ text: "感謝你的參與！" })
                        .setTimestamp();
                    
                    await winner.send({ embeds: [dmEmbed] });
                } catch (error) {
                    logger.error(`無法私信用戶 ${winner.tag || winner.username}`);
                }
            }
        }
        
        // 从活跃抽奖中移除
        activeGiveaways.delete(messageId);
    } catch (error) {
        logger.error(`結束抽獎時發生錯誤: ${error.message}`);
    }
}

function formatDate(date) {
    return `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())} ${padZero(date.getHours())}:${padZero(date.getMinutes())}`;
}

function padZero(num) {
    return num.toString().padStart(2, '0');
}