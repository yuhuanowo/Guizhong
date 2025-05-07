const { EmbedBuilder } = require("discord.js");
const config = require("../../config");
const logger = require("../../utils/logger");
const mongoose = require("mongoose");
const LogChannel = mongoose.model("LogChannel");

module.exports = {
    name: "guildMemberAdd",
    once: false,
    async execute(member, client) {
        // 忽略机器人
        if (member.user.bot) return;
        
        try {
            // 记录基本信息
            logger.info(`[${member.guild.name}] ${member.user.tag} 加入了服务器`);
            
            // 检查该服务器是否有日志设置
            const logSettings = await LogChannel.findOne({ 
                guildId: member.guild.id,
                "logTypes.member": true
            });
            
            // 如果找到日志设置并且成员日志已启用
            if (logSettings) {
                // 获取日志频道
                const channel = member.guild.channels.cache.get(logSettings.channelId);
                if (!channel) return;
                
                // 计算账号创建时间
                const creationDate = Math.floor(member.user.createdTimestamp / 1000);
                
                // 创建嵌入式消息
                const embed = new EmbedBuilder()
                    .setTitle("👋 新成员加入")
                    .setDescription(`${member.user} (${member.user.tag}) 加入了服务器`)
                    .addFields(
                        { name: "🆔 用户ID", value: member.user.id, inline: true },
                        { name: "📆 账号创建日期", value: `<t:${creationDate}:F>\n(<t:${creationDate}:R>)`, inline: true },
                        { name: "👤 当前服务器成员数", value: `${member.guild.memberCount}`, inline: true }
                    )
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
                    .setColor("#4CAF50") // 绿色表示加入
                    .setTimestamp();
                
                // 发送日志消息
                channel.send({ embeds: [embed] }).catch(err => {
                    logger.error(`无法发送成员加入日志: ${err.message}`);
                });
            }
        } catch (error) {
            logger.error(`处理成员加入日志时出错: ${error}`);
        }
    },
};
