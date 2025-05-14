const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');
const config = require('../../config');
const i18n = require('../../utils/i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('language')
        .setNameLocalizations({
            "zh-CN": "language",
            "zh-TW": "language"
        })
        .setDescription('Set the language of the bot') // 默认英语描述
        .setDescriptionLocalizations({
            "zh-CN": "设置机器人的语言",
            "zh-TW": "設定機器人的語言"
        })
        .addStringOption(option => 
            option.setName('language')
                .setDescription('Select a language')
                .setRequired(true)
                .addChoices(
                    { name: 'English', value: 'en' },
                    { name: '简体中文', value: 'zh-CN' },
                    { name: '繁體中文', value: 'zh-TW' }
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    // 提供本地化的命令描述
    getLocalizedData(language) {
        const data = {
            description: i18n.getString('language.description', language),
            optionDescription: i18n.getString('language.select', language)
        };
        
        return data;
    },
    
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const selectedLanguage = interaction.options.getString('language');
        
        try {
            // 设置新语言
            i18n.setServerLanguage(guildId, selectedLanguage);
            
            // 获取新语言的本地化字符串
            const languageChanged = i18n.getString('language.changed', selectedLanguage);
            
            const embed = new EmbedBuilder()
                .setColor(config.embedColour)
                .setDescription(languageChanged)
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
            logger.info(`Guild ${interaction.guild.name} (${guildId}) changed language to ${selectedLanguage}`);
        } catch (error) {
            logger.error(`Error changing language for guild ${guildId}: ${error.message}`);
            await interaction.reply({ 
                content: `❌ Error changing language: ${error.message}`, 
                ephemeral: true 
            });
        }
    }
};
