const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, version } = require("discord.js");
const config = require("../../config");
const i18n = require("../../utils/i18n");
const fs = require("fs");
const os = require("os");
const { execSync } = require("child_process");
const path = require("path");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("botinfo")
        .setNameLocalizations({
            "zh-CN": "botinfo",
            "zh-TW": "botinfo"
        })
        .setDescription("Show detailed information about Guizhong bot.")
        .setDescriptionLocalizations({
            "zh-CN": "显示关于归终机器人的详细信息",
            "zh-TW": "顯示關於歸終機器人的詳細資訊"
        }),
    async execute(interaction, client) {
        const guildId = interaction.guild.id;
        const language = i18n.getServerLanguage(guildId);
        
        // 获取机器人的启动时间
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        
        // 获取机器人版本号（从package.json）
        let botVersion = "v1.0.0"; // 默认版本
        try {
            const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../package.json'), 'utf8'));
            botVersion = packageJson.version || botVersion;
        } catch (error) {
            console.error("无法读取package.json版本信息:", error);
        }
        
        // 获取机器人创建时间
        const botCreatedAt = client?.user?.createdAt ? client.user.createdAt : new Date();
        const botCreatedTimestamp = Math.floor(botCreatedAt.getTime() / 1000);
        
        // 创建嵌入信息
        const embed = new EmbedBuilder();
        embed.setTitle(i18n.getString("commands.botinfo.title", language) || "归终机器人信息");
        embed.setDescription(i18n.getString("commands.botinfo.description", language));
        
        if (client?.user?.avatarURL()) {
            embed.setThumbnail(client.user.avatarURL({ dynamic: true, size: 512 }));
        }
        
        // 获取本地化字段名称
        const authorText = i18n.getString("commands.botinfo.author", language);
        const versionText = i18n.getString("commands.botinfo.version", language);
        const serverText = i18n.getString("commands.botinfo.server", language);
        const supportText = i18n.getString("commands.botinfo.support", language);
        const opensourceText = i18n.getString("commands.botinfo.opensource", language);
        const uptimeText = i18n.getString("commands.botinfo.uptime", language) || "运行时间";
        const createdText = i18n.getString("commands.botinfo.created", language) || "创建于";
        const technicalInfoText = i18n.getString("commands.botinfo.technicalInfo", language) || "技术信息";
        
        // 基础信息字段
        embed.addFields(
            { name: authorText, value: "YuhuanStudio", inline: true }, 
            { name: versionText, value: botVersion, inline: true }, 
            { name: serverText, value: "https://discord.gg/GfUY7ynvXN", inline: true },
            { name: uptimeText, value: `${days}d ${hours}h ${minutes}m ${seconds}s`, inline: true },
            { name: createdText, value: `<t:${botCreatedTimestamp}:R>`, inline: true }, 
            { name: opensourceText, value: "MIT", inline: true }
        );
        
        // 技术信息字段
        embed.addFields({
            name: technicalInfoText,
            value: `Discord.js: v${version}\nNode.js: ${process.version}\n${os.type()} ${os.release()}\nCPU: ${os.cpus()[0].model}`
        });
        
        embed.setColor(config.embedColour);
        embed.setFooter({ 
            text: i18n.getString("commands.botinfo.footer", language, { 
                serverCount: client?.guilds?.cache?.size || 0 
            }) || `当前在 ${client?.guilds?.cache?.size || 0} 个服务器中服务` 
        });
        embed.setTimestamp();

        // 创建按钮
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setStyle(ButtonStyle.Link)
                .setLabel("GitHub")
                .setURL("https://github.com/yuhuanowo/Guizhong")
                .setEmoji("📘"),
            new ButtonBuilder()
                .setStyle(ButtonStyle.Link)
                .setLabel("Contributors")
                .setURL("https://github.com/yuhuanowo/Guizhong/graphs/contributors")
                .setEmoji("👥"),
            new ButtonBuilder()
                .setStyle(ButtonStyle.Link)
                .setLabel(i18n.getString("commands.botinfo.supportButton", language) || "Support")
                .setURL("https://discord.gg/GfUY7ynvXN")
                .setEmoji("🔧"),
            new ButtonBuilder()
                .setStyle(ButtonStyle.Link)
                .setLabel(i18n.getString("commands.botinfo.reportButton", language) || "Report Issue")
                .setURL("https://github.com/yuhuanowo/Guizhong/issues")
                .setEmoji("🐛")
        );

        return await interaction.reply({ embeds: [embed], components: [row] });
    },
};
