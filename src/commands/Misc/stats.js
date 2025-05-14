const { SlashCommandBuilder } = require("@discordjs/builders");
const i18n = require("../../utils/i18n");
const { EmbedBuilder } = require("discord.js");
const config = require("../../config");
const fs = require("fs");
const os = require('os');
const { version } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder().setName("stats")
        .setNameLocalizations({
            "zh-CN": "stats",
            "zh-TW": "stats"
        }).setDescription("Show statistics about the bot.")
        .setDescriptionLocalizations({
            "zh-CN": "显示机器人详细统计数据",
            "zh-TW": "顯示機器人詳細統計信息"
        }),
    async execute(interaction, client) {
        const guildId = interaction.guild.id;
        const language = i18n.getServerLanguage(guildId);
        
        let rawdata = fs.readFileSync("src/JSON/data.json");
        var data = JSON.parse(rawdata);

        // 计算系统运行时间
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        
        // 获取内存使用情况
        const memoryUsage = process.memoryUsage();
        const memoryUsedMB = Math.round(memoryUsage.rss / 1024 / 1024);
        const totalMemoryMB = Math.round(os.totalmem() / 1024 / 1024);
        const memoryPercent = Math.round((memoryUsedMB / totalMemoryMB) * 100);
        
        // 使用本地化字符串
        const embed = new EmbedBuilder();
        embed.setTitle(i18n.getString("commands.stats.title", language));
        embed.setDescription(i18n.getString("commands.stats.description", language, {
            servers: client.guilds.cache.size,
            songs: data["songs-played"],
            skipped: data["songs-skipped"],
            shuffled: data["queues-shuffled"]
        }));
        
        // 添加系统信息字段
        embed.addFields(
            { 
                name: i18n.getString("commands.stats.botInfo", language), 
                value: i18n.getString("commands.stats.botInfoValue", language, {
                    uptime: `${days}${i18n.getString("commands.stats.days", language)} ${hours}${i18n.getString("commands.stats.hours", language)} ${minutes}${i18n.getString("commands.stats.minutes", language)}`,
                    djsVersion: version,
                    nodeVersion: process.version
                }),
                inline: false
            },
            {
                name: i18n.getString("commands.stats.systemInfo", language),
                value: i18n.getString("commands.stats.systemInfoValue", language, {
                    memory: `${memoryUsedMB}MB / ${totalMemoryMB}MB (${memoryPercent}%)`,
                    cpu: os.cpus()[0].model,
                    platform: `${os.type()} ${os.release()}`
                }),
                inline: false
            }
        );
        
        embed.setColor(config.embedColour);
        embed.setFooter({ text: i18n.getString("commands.stats.footer", language, { date: new Date().toISOString() }) });
        embed.setTimestamp();

        return await interaction.reply({ embeds: [embed] });
    },
};
