const { EmbedBuilder } = require("discord.js");
const config = require("../../config");
const logger = require("../../utils/logger");
const mongoose = require("mongoose");
const LogChannel = mongoose.model("LogChannel");

module.exports = {
    name: "guildMemberRemove",
    once: false,
    async execute(member, client) {
        // 忽略机器人
        if (member.user.bot) return;
        
        try {
            // 记录基本信息
            logger.info(`[${member.guild.name}] ${member.user.tag} 离开了服务器`);
            
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
                
                // 计算加入时间（如果可获取）
                let joinedDate = "未知";
                if (member.joinedTimestamp) {
                    const timestamp = Math.floor(member.joinedTimestamp / 1000);
                    joinedDate = `<t:${timestamp}:F>\n(<t:${timestamp}:R>)`;
                }
                
                // 获取角色信息
                const roles = member.roles.cache
                    .filter(role => role.id !== member.guild.id) // 排除@everyone角色
                    .sort((a, b) => b.position - a.position) // 按角色位置排序
                    .map(role => role.toString())
                    .join(', ') || "无角色";
                
                // 创建嵌入式消息
                const embed = new EmbedBuilder()
                    .setTitle("👋 成员离开")
                    .setDescription(`${member.user} (${member.user.tag}) 离开了服务器`)
                    .addFields(
                        { name: "🆔 用户ID", value: member.user.id, inline: true },
                        { name: "📆 加入日期", value: joinedDate, inline: true },
                        { name: "👤 当前服务器成员数", value: `${member.guild.memberCount}`, inline: true },
                        { name: "👑 角色", value: roles.substring(0, 1024) } // Discord限制字段值1024字符
                    )
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
                    .setColor("#F44336") // 红色表示离开
                    .setTimestamp();
                
                // 发送日志消息
                channel.send({ embeds: [embed] }).catch(err => {
                    logger.error(`无法发送成员离开日志: ${err.message}`);
                });
            }
        } catch (error) {
            logger.error(`处理成员离开日志时出错: ${error}`);
        }
    },
};
