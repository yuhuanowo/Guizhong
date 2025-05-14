const { SlashCommandBuilder } = require("@discordjs/builders");
const i18n = require("../../utils/i18n");
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../../config");
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder().setName("help")
        .setNameLocalizations({
            "zh-CN": "help",
            "zh-TW": "help"
        }).setDescription("Shows all Guizhong commands available.")
        .setDescriptionLocalizations({
            "zh-CN": "显示所有可用的归终命令",
            "zh-TW": "顯示所有可用的歸終指令"
        })
        .addStringOption(option => 
            option.setName('command')
                .setDescription('Get help for a specific command')
                .setNameLocalizations({
                    "zh-CN": "命令",
                    "zh-TW": "命令"
                })
                .setDescriptionLocalizations({
                    "zh-CN": "获取特定命令的帮助信息",
                    "zh-TW": "獲取特定命令的幫助信息"
                })
                .setRequired(false)
        ),
    async execute(interaction, client) {
        const guildId = interaction.guild.id;
        const language = i18n.getServerLanguage(guildId);
        
        // 处理特定命令的帮助信息
        const specificCommand = interaction.options.getString('command');
        if (specificCommand) {
            return await handleSpecificCommandHelp(interaction, specificCommand, language);
        }
        
        const embed = new EmbedBuilder();
        embed.setTitle(i18n.getString("commands.help.title", language) || "歸終");
        embed.setDescription(i18n.getString("commands.help.mainDescription", language) || 
                           "要查看所有可用命令，請從下面的選擇菜單中選擇一個類別。");
        embed.setColor(config.embedColour);
        
        // 如果设置了图标，添加图标
        if (client?.user?.avatarURL()) {
            embed.setThumbnail(client.user.avatarURL());
        }
        
        // 添加关于机器人的基本信息
        embed.addFields(
            { 
                name: i18n.getString("commands.help.aboutBot", language) || "关于歸終", 
                value: i18n.getString("commands.help.aboutBotDescription", language) || 
                       "歸終是一个功能强大的Discord音乐机器人，支持多平台音乐播放和高级命令。"
            }
        );
        
        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`help_category_select_${interaction.user.id}`)
                .setPlaceholder(i18n.getString("commands.help.selectCategory", language) || "選擇類別以查看命令")
                .addOptions([
                    {
                        label: i18n.getString("commands.help.categories.general", language) || "General",
                        description: i18n.getString("commands.help.categories.generalDescription", language) || "與音樂無關的命令",
                        value: "help_category_general",
                        emoji: "🔧"
                    },
                    {
                        label: i18n.getString("commands.help.categories.music", language) || "Music Controls",
                        description: i18n.getString("commands.help.categories.musicDescription", language) || "用於音樂的命令",
                        value: "help_category_music",
                        emoji: "🎵"
                    },
                    {
                        label: i18n.getString("commands.help.categories.effects", language) || "Effects",
                        description: i18n.getString("commands.help.categories.effectsDescription", language) || "控制當前音樂效果的命令",
                        value: "help_category_effects",
                        emoji: "🎚️"
                    },
                    {
                        label: i18n.getString("commands.help.categories.llm", language) || "AI Features",
                        description: i18n.getString("commands.help.categories.llmDescription", language) || "AI相關的命令",
                        value: "help_category_llm",
                        emoji: "🤖"
                    },
                    {
                        label: i18n.getString("commands.help.categories.misc", language) || "Miscellaneous",
                        description: i18n.getString("commands.help.categories.miscDescription", language) || "其他實用命令",
                        value: "help_category_misc",
                        emoji: "📌"
                    }
                ])
        );
        
        // 添加辅助按钮
        const buttonsRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel(i18n.getString("commands.help.supportServer", language) || "支持服务器")
                .setStyle(ButtonStyle.Link)
                .setURL("https://discord.gg/GfUY7ynvXN")
                .setEmoji("🔧"),
            new ButtonBuilder()
                .setLabel(i18n.getString("commands.help.githubRepo", language) || "GitHub")
                .setStyle(ButtonStyle.Link)
                .setURL("https://github.com/yuhuanowo/Guizhong")
                .setEmoji("📘"),
            new ButtonBuilder()
                .setCustomId("help_all_commands")
                .setLabel(i18n.getString("commands.help.viewAllCommands", language) || "查看所有命令")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("📋")
        );

        return await interaction.reply({ 
            embeds: [embed], 
            components: [row, buttonsRow] 
        });
    },
};

/**
 * 处理特定命令的帮助请求
 */
async function handleSpecificCommandHelp(interaction, commandName, language) {
    // 搜索所有命令目录
    const commandsFolders = fs.readdirSync(path.join(__dirname, '../')).filter(folder => 
        fs.statSync(path.join(__dirname, '../', folder)).isDirectory()
    );
    
    let targetCommand = null;
    let category = '';
    
    // 在各个目录中查找命令
    for (const folder of commandsFolders) {
        const commandFiles = fs.readdirSync(path.join(__dirname, '../', folder))
            .filter(file => file.endsWith('.js'));
            
        for (const file of commandFiles) {
            const command = require(path.join(__dirname, '../', folder, file));
            
            // 检查命令名称或本地化名称是否匹配
            if (command.data.name === commandName ||
                (command.data.nameLocalizations && 
                 Object.values(command.data.nameLocalizations).includes(commandName))) {
                targetCommand = command;
                category = folder;
                break;
            }
        }
        
        if (targetCommand) break;
    }
    
    if (!targetCommand) {
        return await interaction.reply({
            content: i18n.getString("commands.help.commandNotFound", language, { command: commandName }) || 
                     `找不到命令 "${commandName}"。请检查拼写后重试。`,
            ephemeral: true
        });
    }
    
    // 创建命令帮助嵌入
    const embed = new EmbedBuilder()
        .setTitle(`/${targetCommand.data.name}`)
        .setDescription(
            targetCommand.data.descriptionLocalizations?.[language] || 
            targetCommand.data.description
        )
        .setColor(config.embedColour);
        
    embed.addFields(
        { name: i18n.getString("commands.help.category", language) || "分类", value: category }
    );
    
    // 添加选项信息
    const options = targetCommand.data.options;
    if (options && options.length > 0) {
        let optionsDescription = '';
        
        options.forEach(option => {
            const optionName = option.nameLocalizations?.[language] || option.name;
            const optionDesc = option.descriptionLocalizations?.[language] || option.description;
            const required = option.required ? 
                (i18n.getString("commands.help.required", language) || "（必填）") : 
                (i18n.getString("commands.help.optional", language) || "（可选）");
                
            optionsDescription += `**${optionName}**: ${optionDesc} ${required}\n`;
        });
        
        if (optionsDescription) {
            embed.addFields(
                { name: i18n.getString("commands.help.options", language) || "选项", value: optionsDescription }
            );
        }
    }
    
    // 添加使用示例
    embed.addFields(
        { 
            name: i18n.getString("commands.help.usage", language) || "用法", 
            value: `\`/${targetCommand.data.name}${options && options.length > 0 ? ' [选项]' : ''}\`` 
        }
    );
    
    // 添加返回按钮
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('help_main_menu')
            .setLabel(i18n.getString("commands.help.backToMainMenu", language) || "返回主菜单")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("⬅️")
    );
    
    return await interaction.reply({ embeds: [embed], components: [row] });
}
