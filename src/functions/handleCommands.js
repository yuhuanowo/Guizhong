const { REST } = require("@discordjs/rest");
const { Routes } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");
const logger = require("../utils/logger");
const config = require("../config");
const i18n = require("../utils/i18n");

const token = config.token;
const clientId = config.clientId;

module.exports = (client) => {
    client.handleCommands = async () => {
        client.commandArray = [];

        const commandFolders = fs.readdirSync("src/commands");

        for (var folder of commandFolders) {
            const commandFiles = fs.readdirSync(`src/commands/${folder}`).filter(file => file.endsWith('.js'));
            for (const file of commandFiles) {
                const command = require(`../commands/${folder}/${file}`);
                if (!command.data || !command.data.name) {
                    logger.error(`Command file ${file} is missing "data" or "name" property.`);
                    continue; // 跳过无效的命令文件
                }
                
                // 记录命令的处理
                logger.info(`Processing command: ${command.data.name} (${file})`);
                
                // 获取命令JSON，这会保留所有设置包括本地化
                const commandData = command.data.toJSON();
                
                // 检查命令是否已设置了本地化
                const hasNameLocalizationZhCN = commandData.name_localizations && commandData.name_localizations['zh-CN'];
                const hasNameLocalizationZhTW = commandData.name_localizations && commandData.name_localizations['zh-TW'];
                const hasDescLocalizationZhCN = commandData.description_localizations && commandData.description_localizations['zh-CN'];
                const hasDescLocalizationZhTW = commandData.description_localizations && commandData.description_localizations['zh-TW'];
                
                // 记录本地化状态
                if (hasNameLocalizationZhCN) {
                    // logger.info(`Command ${command.data.name} has zh-CN name localization: ${commandData.name_localizations['zh-CN']}`);
                }
                if (hasNameLocalizationZhTW) {
                    // logger.info(`Command ${command.data.name} has zh-TW name localization: ${commandData.name_localizations['zh-TW']}`);
                }
                
                // 如果命令中没有设置名称本地化，尝试使用i18n
                if (!hasNameLocalizationZhCN || !hasNameLocalizationZhTW) {
                    const nameKey = `commands.${command.data.name}.name`;
                    
                    if (!hasNameLocalizationZhCN) {
                        const nameZhCN = i18n.getString(nameKey, 'zh-CN');
                        if (nameZhCN && nameZhCN !== nameKey) {
                            command.data.setNameLocalization('zh-CN', nameZhCN);
                            // logger.info(`Added zh-CN name localization from i18n for ${command.data.name}: ${nameZhCN}`);
                        }
                    }
                    
                    if (!hasNameLocalizationZhTW) {
                        const nameZhTW = i18n.getString(nameKey, 'zh-TW');
                        if (nameZhTW && nameZhTW !== nameKey) {
                            command.data.setNameLocalization('zh-TW', nameZhTW);
                            // logger.info(`Added zh-TW name localization from i18n for ${command.data.name}: ${nameZhTW}`);
                        }
                    }
                }
                
                // 如果命令中没有设置描述本地化，尝试使用i18n
                if (!hasDescLocalizationZhCN || !hasDescLocalizationZhTW) {
                    const descKey = `commands.${command.data.name}.description`;
                    
                    if (!hasDescLocalizationZhCN) {
                        const descZhCN = i18n.getString(descKey, 'zh-CN');
                        if (descZhCN && descZhCN !== descKey) {
                            command.data.setDescriptionLocalization('zh-CN', descZhCN);
                            // logger.info(`Added zh-CN description localization from i18n for ${command.data.name}`);
                        }
                    }
                    
                    if (!hasDescLocalizationZhTW) {
                        const descZhTW = i18n.getString(descKey, 'zh-TW');
                        if (descZhTW && descZhTW !== descKey) {
                            command.data.setDescriptionLocalization('zh-TW', descZhTW);
                            // logger.info(`Added zh-TW description localization from i18n for ${command.data.name}`);
                        }
                    }
                }
                
                // 处理子命令和选项的本地化
                if (command.data.options && command.data.options.length > 0) {
                    for (const option of command.data.options) {
                        // 处理子命令或选项的本地化
                        const optionType = option.type;
                        const optionName = option.name;
                        
                        // 获取选项JSON数据，查看是否已有本地化设置
                        const optionData = option.toJSON();
                        const hasOptionDescZhCN = optionData.description_localizations && optionData.description_localizations['zh-CN'];
                        const hasOptionDescZhTW = optionData.description_localizations && optionData.description_localizations['zh-TW'];
                        
                        // 如果选项没有本地化，尝试从i18n获取
                        if (!hasOptionDescZhCN || !hasOptionDescZhTW) {
                            const optionKey = `commands.${command.data.name}.options.${optionName}`;
                            
                            if (!hasOptionDescZhCN) {
                                const optionDescZhCN = i18n.getString(optionKey, 'zh-CN');
                                if (optionDescZhCN && optionDescZhCN !== optionKey) {
                                    option.setDescriptionLocalization('zh-CN', optionDescZhCN);
                                }
                            }
                            
                            if (!hasOptionDescZhTW) {
                                const optionDescZhTW = i18n.getString(optionKey, 'zh-TW');
                                if (optionDescZhTW && optionDescZhTW !== optionKey) {
                                    option.setDescriptionLocalization('zh-TW', optionDescZhTW);
                                }
                            }
                        }
                        
                        // 如果是子命令且有选项，递归处理子命令的选项
                        if ((optionType === 1 || optionType === 2) && option.options && option.options.length > 0) {
                            for (const subOption of option.options) {
                                const subOptionName = subOption.name;
                                const subOptionData = subOption.toJSON();
                                const hasSubOptionDescZhCN = subOptionData.description_localizations && subOptionData.description_localizations['zh-CN'];
                                const hasSubOptionDescZhTW = subOptionData.description_localizations && subOptionData.description_localizations['zh-TW'];
                                
                                if (!hasSubOptionDescZhCN || !hasSubOptionDescZhTW) {
                                    const subOptionKey = `commands.${command.data.name}.options.${optionName}.options.${subOptionName}`;
                                    
                                    if (!hasSubOptionDescZhCN) {
                                        const subOptionDescZhCN = i18n.getString(subOptionKey, 'zh-CN');
                                        if (subOptionDescZhCN && subOptionDescZhCN !== subOptionKey) {
                                            subOption.setDescriptionLocalization('zh-CN', subOptionDescZhCN);
                                        }
                                    }
                                    
                                    if (!hasSubOptionDescZhTW) {
                                        const subOptionDescZhTW = i18n.getString(subOptionKey, 'zh-TW');
                                        if (subOptionDescZhTW && subOptionDescZhTW !== subOptionKey) {
                                            subOption.setDescriptionLocalization('zh-TW', subOptionDescZhTW);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                
                client.commands.set(command.data.name, command);
                const finalCommandData = command.data.toJSON();
                client.commandArray.push(finalCommandData);
                
                // 记录最终的命令数据
                // logger.info(`Processed command ${command.data.name}: has name_localizations: ${!!finalCommandData.name_localizations}, has description_localizations: ${!!finalCommandData.description_localizations}`);
            }
        }

        const rest = new REST({ version: "10" }).setToken(token);

        (async () => {
            try {
                logger.info("Reloading application commands...");
                await rest.put(Routes.applicationCommands(clientId), {
                    body: client.commandArray,
                });
                logger.success("Successfully reloaded application commands.");
            } catch (error) {
                logger.error("An error occurred whilst attempting to reload application commands:");
                logger.error(error);
            }
        })();
    };
};
