const { ChannelType } = require('discord.js');
const logger = require("../../utils/logger");
const fs = require('fs');
const path = require('path');

module.exports = {
    name: "voiceStateUpdate",
    once: false,
    async execute(oldState, newState, client) {
        // 忽略機器人
        if (newState.member.user.bot) return;

        try {
            // 從JSON文件讀取配置
            const configPath = path.join(__dirname, '../../JSON/voiceChannelConfig.json');
            const configData = fs.readFileSync(configPath, 'utf8');
            const voiceConfig = JSON.parse(configData);

            // 檢查配置文件中是否啟用了自動生成語音頻道功能
            if (!voiceConfig.enabled) return;
            
            // 獲取當前伺服器的配置
            const guildId = newState.guild.id;
            const serverConfig = voiceConfig.serverConfigs?.[guildId];
            
            // 如果沒有此伺服器的配置，則退出
            if (!serverConfig) return;
            
            // 獲取源頻道ID和名稱前綴配置
            const sourceChannelId = serverConfig.sourceChannelId;
            const namePrefix = serverConfig.namePrefix || "語音頻道-";
            const nameTemplate = serverConfig.nameTemplate || "{username}";
            const defaultUserLimit = serverConfig.defaultUserLimit || 0;
            
            // 如果沒有指定源頻道，則退出
            if (!sourceChannelId) return;
            
            // 檢查用戶是否加入了指定的源頻道
            if (newState.channelId === sourceChannelId) {
                // 獲取用戶所在的伺服器
                const guild = newState.guild;
                const member = newState.member;
                
                // 創建頻道名稱，使用用戶名或暱稱
                const displayName = member.nickname || member.user.username;
                // 使用模板替換用戶名
                let channelName = nameTemplate.replace('{username}', displayName);
                channelName = `${namePrefix}${channelName}`;
                
                // 創建新的語音頻道
                const category = newState.channel.parent;
                const createdChannel = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildVoice,
                    parent: category ? category.id : null, // 保持在同一分類下
                    userLimit: defaultUserLimit,
                    permissionOverwrites: [
                        {
                            id: member.id,
                            allow: ['ManageChannels', 'PrioritySpeaker'] // 給創建者頻道管理權限
                        }
                    ]
                });
                
                // 將用戶移至新創建的頻道
                await member.voice.setChannel(createdChannel);
                
                logger.info(`[${guild.name}] 為 ${member.user.tag} 創建了新的語音頻道: ${channelName}`);
                
                // 監聽頻道空閒，當沒有用戶時自動刪除
                const checkEmpty = setInterval(() => {
                    // 如果頻道不存在了（手動刪除），清除定時器
                    if (!guild.channels.cache.has(createdChannel.id)) {
                        clearInterval(checkEmpty);
                        return;
                    }
                    
                    // 如果頻道中沒有用戶，刪除頻道並清除定時器
                    if (createdChannel.members.size === 0) {
                        createdChannel.delete()
                            .then(() => {
                                logger.info(`[${guild.name}] 自動刪除了空閒語音頻道: ${channelName}`);
                            })
                            .catch(error => {
                                logger.error(`刪除空閒語音頻道時出錯: ${error}`);
                            });
                        clearInterval(checkEmpty);
                    }
                }, 10000); // 每10秒檢查一次
            }
        } catch (error) {
            logger.error(`語音頻道處理時出錯: ${error}`);
        }
    }
};