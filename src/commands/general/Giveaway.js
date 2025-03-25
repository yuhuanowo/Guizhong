const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const fs = require("fs");
const logger = require("../../utils/logger");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("giveaway")
        .setDescription("開始一個抽獎活動")
        .addStringOption((option) =>
            option
                .setName("獎品")
                .setDescription("請輸入獎品資訊")
                .setRequired(true)
        )
        .addIntegerOption((option) =>
            option
                .setName("winners")
                .setDescription("得獎者數量")
                .setRequired(true)
        )
        .addIntegerOption((option) =>
            option
                .setName("time")
                .setDescription("持續時間（分鐘）")
                .setRequired(true)
        ),

    async execute(interaction) {
        const prize = interaction.options.getString("獎品");
        const winnersCount = interaction.options.getInteger("winners");
        const duration = interaction.options.getInteger("time") * 60; // 将分钟转换为秒
        const endTime = new Date(Date.now() + duration * 1000);

        const startEmbed = new EmbedBuilder()
            .setTitle("🎉 抽獎開始！")
            .setDescription(`獎品：**${prize}**\n點擊 🎉 來參加！\n剩餘時間：<t:${Math.floor(endTime.getTime() / 1000)}:R>。`)
            .setColor("#FFC0CB")
            .setThumbnail("https://cdn.example.com/giveaway.png")
            .setFooter({ text: "祝您好運！" })
            .setTimestamp();

        await interaction.reply({ embeds: [startEmbed] });
        const giveawayMessage = await interaction.fetchReply();
        await giveawayMessage.react("🎉");

        setTimeout(async () => {
            logger.info("計時器結束，開始抽獎");
            const msg = await interaction.channel.messages.fetch(giveawayMessage.id);
            const reaction = msg.reactions.cache.get("🎉");
            const users = await reaction.users.fetch();
            const usersArray = Array.from(users.values()).filter((u) => !u.bot); // 排除機器人用戶

            if (usersArray.length === 0) {
                logger.info("沒有任何人參與抽獎");
                return interaction.followUp("沒有任何人參與抽獎。");
            }
            const shuffled = usersArray.sort(() => 0.5 - Math.random());
            const winners = shuffled.slice(0, winnersCount);

            const resultEmbed = new EmbedBuilder()
                .setTitle("🎉 抽獎結束！")
                .setDescription(
                    `獎品：**${prize}**\n` +
                    `得獎者：${winners.map((w) => `<@${w.id}>`).join("， ")}`
                )
                .setColor("#FFD700")
                .setThumbnail("https://cdn.example.com/giveaway.png")
                .setFooter({ text: "感謝大家的參與！" })
                .setTimestamp();

            interaction.followUp({ embeds: [resultEmbed] });

            // 私信中獎者
            for (const winner of winners) {
                try {
                    const dmEmbed = new EmbedBuilder()
                        .setTitle("🎉 恭喜你！")
                        .setDescription(`你在抽獎活動中贏得了 **${prize}**。請聯繫管理員領取你的獎品。`)
                        .setColor("#FFD700")
                        .setThumbnail("https://cdn.example.com/giveaway.png")
                        .addFields(
                            { name: "獎品", value: `**${prize}**`, inline: false },
                            { name: "群組名稱", value: interaction.guild.name, inline: true },
                            { name: "傳送連結", value: `[點擊這裡](https://discord.com/channels/${interaction.guild.id}/${interaction.channel.id})`, inline: true }
                        )
                        .setFooter({ text: "感謝你的參與！" })
                        .setTimestamp();

                    await winner.send({ embeds: [dmEmbed] });

                    // 增加稍後提醒功能
                    setTimeout(async () => {
                        try {
                            await winner.send({ embeds: [dmEmbed] });
                        } catch (error) {
                            logger.error(`無法再次私信用戶 ${winner.tag}`);
                        }
                    }, 3600000); // 1小時後提醒
                } catch (error) {
                    logger.error(`無法私信用戶 ${winner.tag}`);
                }
            }
        }, duration * 1000);
    },
};