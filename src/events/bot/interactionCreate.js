const logger = require("../../utils/logger");
const config = require("../../config");
const i18n = require("../../utils/i18n");
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./chatlog.db");
const { 
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require("discord.js");


module.exports = {
    name: "interactionCreate",
    once: false,
    async execute(interaction, client) {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.execute(interaction, client);
            } catch (error) {
                logger.error("An error occurred whilst attempting to execute a chat input command:"); //嘗試執行聊天輸入命令時發生錯誤
                logger.error(error);
            }
        } else if (interaction.isButton()) {
            // 处理线程会话控制按钮
            if (interaction.customId.startsWith("end_session_") || 
                interaction.customId.startsWith("session_info_") || 
                interaction.customId.startsWith("toggle_search_") ||
                interaction.customId.startsWith("pause_session_") ||
                interaction.customId.startsWith("export_session_") ||
                interaction.customId.startsWith("clear_history_")) {
                
                const startCommand = require("../../commands/LLM/Start");
                const threadId = interaction.customId.split("_").pop();
                const guildId = interaction.guild.id;
                const language = i18n.getServerLanguage(guildId);
                const session = startCommand.getActiveSession(threadId);
                
                if (!session) {
                    return await interaction.reply({
                        content: i18n.getString("commands.start.sessionExpired", language),
                        ephemeral: true
                    });
                }

                // 检查权限 - 只有会话创建者和管理员可以控制
                if (interaction.user.id !== session.userId && !interaction.member.permissions.has("ManageThreads")) {
                    return await interaction.reply({
                        content: i18n.getString("commands.start.noPermission", language),
                        ephemeral: true
                    });
                }

                if (interaction.customId.startsWith("end_session_")) {
                    try {
                        // 检查用户权限（保留权限检查逻辑）
                        const isAdmin = interaction.member.permissions.has("ADMINISTRATOR") || 
                                       interaction.member.permissions.has("MANAGE_GUILD");
                        const userId = interaction.user.id;
                        
                        // 结束会话，传递用户ID和管理员权限
                        const result = await startCommand.endSession(threadId, interaction.client, false, userId, isAdmin);
                        
                        // 如果操作被拒绝（不是管理员尝试结束永久会话），显示错误信息
                        if (!result.success) {
                            const errorEmbed = new EmbedBuilder()
                                .setTitle("❌ 操作失败")
                                .setDescription(result.message || "无法结束会话")
                                .setColor("#ff0000");
                                
                            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                            return;
                        }
                        
                        // 操作成功，使用原来的简单逻辑
                        const embed = new EmbedBuilder()
                            .setTitle(i18n.getString("commands.start.sessionEnded", language))
                            .setDescription(i18n.getString("commands.start.sessionEndedDesc", language))
                            .setColor("#ff9900")
                            .setTimestamp();

                        // 先回复交互，再删除线程
                        await interaction.reply({ embeds: [embed] });
                        
                        // 删除线程（延迟1秒让用户看到消息）
                        setTimeout(() => {
                            // 使用匿名函数而不是异步函数，避免未捕获的Promise异常
                            if (interaction.channel && interaction.channel.isThread()) {
                                interaction.channel.delete("AI聊天会话已结束")
                                    .then(() => {
                                        logger.info(`按钮交互：线程已删除: ${threadId}`);
                                    })
                                    .catch((error) => {
                                        logger.error("按钮交互：删除线程失败:", error);
                                        // 如果删除失败，尝试归档
                                        if (interaction.channel) {
                                            interaction.channel.setArchived(true)
                                                .then(() => {
                                                    logger.info(`线程已归档: ${threadId}`);
                                                })
                                                .catch((archiveError) => {
                                                    logger.error("归档线程失败:", archiveError);
                                                });
                                        }
                                    });
                            }
                        }, 2000);
                    } catch (error) {
                        logger.error("结束会话时发生错误:", error);
                        try {
                            const errorEmbed = new EmbedBuilder()
                                .setTitle("❌ 处理失败")
                                .setDescription("处理会话操作时发生错误")
                                .setColor("#ff0000");
                            
                            // 检查交互是否已经回复
                            if (!interaction.replied && !interaction.deferred) {
                                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                            }
                        } catch (replyError) {
                            logger.error("回复交互失败:", replyError);
                        }
                    }

                } else if (interaction.customId.startsWith("session_info_")) {
                    // 显示会话信息
                    const embed = new EmbedBuilder()
                        .setTitle(i18n.getString("commands.start.sessionInfo", language))
                        .addFields(
                            {
                                name: i18n.getString("commands.start.sessionId", language),
                                value: session.sessionId.split('-')[0],
                                inline: true
                            },
                            {
                                name: i18n.getString("commands.start.model", language),
                                value: session.model,
                                inline: true
                            },
                            {
                                name: i18n.getString("commands.start.searchStatus", language),
                                value: session.enableSearch ? 
                                    i18n.getString("commands.agent.search", language) : 
                                    i18n.getString("commands.agent.searchdisable", language),
                                inline: true
                            },
                            {
                                name: i18n.getString("commands.start.createdAt", language),
                                value: `<t:${Math.floor(session.createdAt.getTime() / 1000)}:F>`,
                                inline: false
                            },
                            {
                                name: i18n.getString("commands.start.messageCount", language),
                                value: `${session.messages.length / 2} ${i18n.getString("commands.start.exchanges", language)}`,
                                inline: true
                            }
                        )
                        .setColor("#5865F2")
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed], ephemeral: true });

                } else if (interaction.customId.startsWith("toggle_search_")) {
                    // 切换搜索状态
                    session.enableSearch = !session.enableSearch;
                    
                    const embed = new EmbedBuilder()
                        .setTitle(i18n.getString("commands.start.searchToggled", language))
                        .setDescription(session.enableSearch ? 
                            i18n.getString("commands.start.searchEnabled", language) : 
                            i18n.getString("commands.start.searchDisabled", language))
                        .setColor(session.enableSearch ? "#00ff00" : "#ff9900");

                    // 更新按钮
                    const controlRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`end_session_${threadId}`)
                                .setLabel(i18n.getString("commands.start.endSession", language))
                                .setStyle(ButtonStyle.Danger)
                                .setEmoji("🔚"),
                            new ButtonBuilder()
                                .setCustomId(`session_info_${threadId}`)
                                .setLabel(i18n.getString("commands.start.sessionInfo", language))
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji("ℹ️"),
                            new ButtonBuilder()
                                .setCustomId(`toggle_search_${threadId}`)
                                .setLabel(session.enableSearch ? 
                                    i18n.getString("commands.start.disableSearch", language) : 
                                    i18n.getString("commands.start.enableSearch", language))
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji("🔍")
                        );

                    await interaction.update({ embeds: [embed], components: [controlRow] });

                } else if (interaction.customId.startsWith("pause_session_")) {
                    // 暂停/恢复会话
                    const isPaused = startCommand.isSessionPaused(threadId);
                    
                    if (isPaused) {
                        startCommand.resumeSession(threadId);
                        const embed = new EmbedBuilder()
                            .setTitle(i18n.getString("commands.start.sessionResumed", language))
                            .setDescription(i18n.getString("commands.start.sessionResumedDesc", language))
                            .setColor("#00ff00");
                        
                        await interaction.reply({ embeds: [embed] });
                    } else {
                        startCommand.pauseSession(threadId);
                        const embed = new EmbedBuilder()
                            .setTitle(i18n.getString("commands.start.sessionPaused", language))
                            .setDescription(i18n.getString("commands.start.sessionPausedDesc", language))
                            .setColor("#ff9900");
                        
                        await interaction.reply({ embeds: [embed] });
                    }

                } else if (interaction.customId.startsWith("export_session_")) {
                    // 导出会话
                    const exportData = startCommand.getSessionExportData(threadId);
                    
                    if (exportData) {
                        const jsonData = JSON.stringify(exportData, null, 2);
                        const buffer = Buffer.from(jsonData, 'utf8');
                        
                        const embed = new EmbedBuilder()
                            .setTitle(i18n.getString("commands.start.sessionExported", language))
                            .setDescription(i18n.getString("commands.start.sessionExportedDesc", language))
                            .setColor("#00ff00");

                        await interaction.reply({
                            embeds: [embed],
                            files: [{
                                attachment: buffer,
                                name: `chat-session-${session.sessionId.split('-')[0]}.json`
                            }],
                            ephemeral: true
                        });
                    } else {
                        await interaction.reply({
                            content: i18n.getString("commands.start.sessionExpired", language),
                            ephemeral: true
                        });
                    }

                } else if (interaction.customId.startsWith("clear_history_")) {
                    // 清空历史记录
                    const success = startCommand.clearSessionHistory(threadId);
                    
                    if (success) {
                        const embed = new EmbedBuilder()
                            .setTitle(i18n.getString("commands.start.historyCleared", language))
                            .setDescription(i18n.getString("commands.start.historyClearedDesc", language))
                            .setColor("#ff9900");

                        await interaction.reply({ embeds: [embed] });
                    } else {
                        await interaction.reply({
                            content: i18n.getString("commands.start.sessionExpired", language),
                            ephemeral: true
                        });
                    }
                }
                return;
            }

            if (interaction.customId.includes("-")) {
                const dashIndex = interaction.customId.indexOf("-");
                const button = client.buttons.get(interaction.customId.substring(0, dashIndex));
                if (!button) return;
                try {
                    await button.execute(interaction, client);
                } catch (error) {
                    logger.error("An error occurred whilst attempting to execute a button command:"); //嘗試執行按鈕命令時發生錯誤
                    logger.error(error);
                }
            } else if (interaction.customId.includes("_")) {
                // 处理下划线分隔的按钮ID（例如：showSearchResults_messageId）
                const underscoreIndex = interaction.customId.lastIndexOf("_");
                const buttonName = interaction.customId.substring(0, underscoreIndex);
                const button = client.buttons.get(buttonName);
                if (!button) return;
                try {
                    await button.execute(interaction, client);
                } catch (error) {
                    logger.error("An error occurred whilst attempting to execute a button command:"); //嘗試執行按鈕命令時發生錯誤
                    logger.error(error);
                }
            } else {
                const button = client.buttons.get(interaction.customId);
                if (!button) return;
                try {
                    await button.execute(interaction, client);
                } catch (error) {
                    logger.error("An error occurred whilst attempting to execute a button command:"); //嘗試執行按鈕命令時發生錯誤
                    logger.error(error);
                }
            }
        } else if (interaction.isStringSelectMenu()) {
            const buttonOwner = interaction.customId.substring(interaction.customId.length - 18, interaction.customId.length);

            const embed = new EmbedBuilder();
            embed.setColor(config.embedColour);

            if (interaction.user.id != buttonOwner && interaction.customId != "historySelect") {
                embed.setDescription(`Only <@${buttonOwner}> can use this menu.`); //只有<@${buttonOwner}>可以使用此選單。
                return await interaction.reply({
                    embeds: [embed],
                    ephemeral: true,
                });
            }
            // 處理選單事件
            if (interaction.customId == "historySelect") {
                db.get(
                  "SELECT id, prompt, reply FROM chat_log WHERE id = ? AND user_id = ?",
                  [interaction.values[0], interaction.user.id],
                  async (err, row) => {
                    if (err || !row) {
                      const embed = new EmbedBuilder()
                        .setTitle("歷史對話")
                        .setDescription("找不到紀錄");
                      return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                    }
                
                    // 确保 prompt 和 reply 是字符串
                    const prompt = row.prompt ? row.prompt.toString() : "無";
                    let reply = row.reply ? row.reply.toString() : "無";
                    //如果reply內容長度超過1024字元，則將取代為[點擊這裡查看完整內容]
                    if (reply.length > 1024) {
                        reply = reply.slice(0, 1017) + ".......";
                    }

                
                    // 顯示對話
                    const embed = new EmbedBuilder()
                      .setTitle("歷史對話")
                      .setDescription("以下是您的對話紀錄")
                      .addFields(
                        { name: "用戶輸入", value: prompt, inline: false },
                        { name: "AI 回覆", value: reply, inline: false }
                      )
                      .setFooter({ text: `紀錄ID: ${row.id}` })
                      .setColor("#e8d8ff")
                      .setTimestamp();

                
                    return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral});
                  }
                );
            }

            if (interaction.customId == `checkin_select_${interaction.user.id}`) {
                //成功簽到
                embed.setAuthor({ name: `${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
                embed.setColor(config.embedColour);
                embed.setTitle(`${interaction.values[0]}!`); //簽到成功！
                embed.setDescription(`${interaction.user} 已經成功完成每日任務了!`); //你已經成功簽到了！
                return await interaction.reply({ embeds: [embed] });
            }

            if (interaction.values[0] == "help_category_general") {
                embed.setAuthor({ name: "Help" });
                embed.setTitle("General Commands");
                embed.setDescription("**/help** - Shows all  commands available.\n**/stats** - View some  bot statistics.\n**/botinfo** - View information .");
                return await interaction.update({ embeds: [embed] });
            } else if (interaction.values[0] == "help_category_music") {
                embed.setAuthor({ name: "Help" });
                embed.setTitle("Music Commands");
                embed.setDescription("**/play** - Adds a track to the end of the queue.\n**/playnext** - Adds a track to the next position in the queue.\n**/playshuffle** - Shuffles a playlist then adds all tracks to the end of the queue.\n**/pause** - Pauses the current music.\n**/resume** - Unpauses the current music.\n**/stop** - Stops the current music.\n**/skip** - Skips the current music.\n**/back** - Returns to the previous music.\n**/seek** - Seeks the current track to a specified position.\n**/nowplaying** - Shows information about the current track.\n**/queue** - Shows all tracks currently in the queue.\n**/clear** - Clears the queue.\n**/shuffle** - Shuffles all tracks currently in the queue.\n**/loop** - Changes the loop mode for the current music.\n**/volume** - Adjusts the volume of the current music.\n**/lyrics** - Search for the lyrics to a specified track.\n**/save** - Saves the current track information to your messages.");
                return await interaction.update({ embeds: [embed] });
            } else if (interaction.values[0] == "help_category_effects") {
                embed.setAuthor({ name: "Help" });
                embed.setTitle("Effect Commands");
                embed.setDescription("**/8d** - Applies the 8D filter to the currrent track.\n**/bassboost** - Applies the bass boost filter to the currrent track.\n**/chorus** - Applies the chorus filter to the currrent track.\n**/compressor** - Applies the compressor filter to the currrent track.\n**/expander** - Applies the expander filter to the currrent track.\n**/flanger** - Applies the flanger filter to the currrent track.\n**/nightcore** - Applies the nightcore filter to the currrent track.\n**/normalizer** - Applies the normalizer filter to the currrent track.\n**/phaser** - Applies the phaser filter to the currrent track.\n**/reverse** - Applies the reverse filter to the currrent track.\n**/surround** - Applies the surround filter to the currrent track.\n**/vaporwave** - Applies the vaporwave filter to the currrent track.");
                return await interaction.update({ embeds: [embed] });
            }

            
        } else if (interaction.isAutocomplete()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                if (typeof command.autocompleteRun === "function") {
                    await command.autocompleteRun(interaction, client);
                }
            } catch (error) {
                logger.error("An error occurred whilst attempting to run autocomplete:"); //嘗試執行自動完成時發生錯誤
                logger.error(error);
            }
        }
    },
};
