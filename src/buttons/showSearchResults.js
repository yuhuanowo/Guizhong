const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const i18n = require("../utils/i18n");

// 创建一个全局搜索结果缓存
const searchResultsCache = new Map();

module.exports = {
  name: "showSearchResults",
  searchResultsCache, // 导出缓存供其他模块使用
  async execute(interaction) {
    try {
      console.log('showSearchResults executed with customId:', interaction.customId);
      console.log('Message embeds count:', interaction.message.embeds.length);
      
      if (!interaction.customId.startsWith("showSearchResults_") && !interaction.customId.startsWith("hideSearchResults_")) {
        return;
      }

      const guildId = interaction.guild.id;
      const language = i18n.getServerLanguage(guildId);
      
      // 获取原始消息
      const embed = interaction.message.embeds[0];
      if (!embed) return;

      const messageId = interaction.customId.split("_")[1];
      
      // 从缓存中获取搜索结果
      const searchResults = searchResultsCache.get(messageId) || [];

      if (interaction.customId.startsWith("showSearchResults_")) {
        // 如果缓存中没有搜索结果，说明缓存已过期
        if (!searchResults || searchResults.length === 0) {
          await interaction.reply({
            content: i18n.getString("commands.agent.searchResultsExpired", language) || "搜索结果已过期，请重新搜索。",
            ephemeral: true
          });
          return;
        }

        const newEmbed = EmbedBuilder.from(embed);
        
        const maxLength = 1024;
        const searchResultsText = searchResults.map(result =>
          `**${result.title}**\n${result.url}\n${result.contentSnippet || ''}`
        ).join('\n\n');

        if (searchResultsText.length <= maxLength) {
          newEmbed.addFields({
            name: i18n.getString("commands.agent.searchResults", language),
            value: searchResultsText,
            inline: false
          });
        } else {
          const searchEmbed = new EmbedBuilder()
            .setTitle(i18n.getString("commands.agent.fullsearchResults", language))
            .setDescription(searchResultsText)
            .setColor("#5865F2");

          newEmbed.addFields({
            name: i18n.getString("commands.agent.searchResults", language),
            value: i18n.getString("commands.agent.searchResultsTooLong", language),
            inline: false
          });

          // 重新创建按钮组件
          const newComponents = [];
          if (interaction.message.components && interaction.message.components[0]) {
            const newRow = new ActionRowBuilder();
            
            for (const component of interaction.message.components[0].components) {
              if (component.customId === `showSearchResults_${messageId}`) {
                // 更新搜索结果按钮为隐藏按钮
                const newButton = new ButtonBuilder()
                  .setCustomId(`hideSearchResults_${messageId}`)
                  .setLabel(i18n.getString("commands.agent.hideSearchResults", language))
                  .setStyle(ButtonStyle.Secondary);
                
                // 保持原有的emoji
                if (component.emoji) {
                  if (typeof component.emoji === 'string') {
                    newButton.setEmoji(component.emoji);
                  } else if (component.emoji.name) {
                    newButton.setEmoji(component.emoji.name);
                  }
                }
                
                newRow.addComponents(newButton);
              } else {
                // 保持其他按钮不变
                const newButton = new ButtonBuilder()
                  .setCustomId(component.customId)
                  .setLabel(component.label)
                  .setStyle(component.style);
                
                if (component.emoji) {
                  if (typeof component.emoji === 'string') {
                    newButton.setEmoji(component.emoji);
                  } else if (component.emoji.name) {
                    newButton.setEmoji(component.emoji.name);
                  }
                }
                
                newRow.addComponents(newButton);
              }
            }
            newComponents.push(newRow);
          }

          await interaction.update({ embeds: [newEmbed, searchEmbed], components: newComponents });
          return;
        }

        // 重新创建按钮组件
        const newComponents = [];
        if (interaction.message.components && interaction.message.components[0]) {
          const newRow = new ActionRowBuilder();
          
          for (const component of interaction.message.components[0].components) {
            if (component.customId === `showSearchResults_${messageId}`) {
              // 更新搜索结果按钮为隐藏按钮
              const newButton = new ButtonBuilder()
                .setCustomId(`hideSearchResults_${messageId}`)
                .setLabel(i18n.getString("commands.agent.hideSearchResults", language))
                .setStyle(ButtonStyle.Secondary);
              
              // 保持原有的emoji
              if (component.emoji) {
                if (typeof component.emoji === 'string') {
                  newButton.setEmoji(component.emoji);
                } else if (component.emoji.name) {
                  newButton.setEmoji(component.emoji.name);
                }
              }
              
              newRow.addComponents(newButton);
            } else {
              // 保持其他按钮不变
              const newButton = new ButtonBuilder()
                .setCustomId(component.customId)
                .setLabel(component.label)
                .setStyle(component.style);
              
              if (component.emoji) {
                if (typeof component.emoji === 'string') {
                  newButton.setEmoji(component.emoji);
                } else if (component.emoji.name) {
                  newButton.setEmoji(component.emoji.name);
                }
              }
              
              newRow.addComponents(newButton);
            }
          }
          newComponents.push(newRow);
        }

        await interaction.update({ embeds: [newEmbed], components: newComponents });
      } else if (interaction.customId.startsWith("hideSearchResults_")) {
        // 获取原始消息的第一个embed
        const newEmbed = EmbedBuilder.from(embed);
        
        // 找到并移除搜索结果字段
        const fieldIndex = newEmbed.data.fields?.findIndex(field => 
          field.name === i18n.getString("commands.agent.searchResults", language)
        );
        
        if (fieldIndex !== -1) {
          newEmbed.spliceFields(fieldIndex, 1);
        }

        // 始终只使用第一个embed（不包含搜索结果）
        // 忽略任何可能存在的第二个embed（带有完整搜索结果的embed）
        
        // 重新创建按钮组件
        const newComponents = [];
        if (interaction.message.components && interaction.message.components[0]) {
          const newRow = new ActionRowBuilder();
          
          for (const component of interaction.message.components[0].components) {
            if (component.customId === `hideSearchResults_${messageId}`) {
              // 更新隐藏按钮为显示按钮
              const newButton = new ButtonBuilder()
                .setCustomId(`showSearchResults_${messageId}`)
                .setLabel(i18n.getString("commands.agent.showSearchResults", language))
                .setStyle(ButtonStyle.Secondary);
              
              // 保持原有的emoji
              if (component.emoji) {
                if (typeof component.emoji === 'string') {
                  newButton.setEmoji(component.emoji);
                } else if (component.emoji.name) {
                  newButton.setEmoji(component.emoji.name);
                }
              }
              
              newRow.addComponents(newButton);
            } else {
              // 保持其他按钮不变
              const newButton = new ButtonBuilder()
                .setCustomId(component.customId)
                .setLabel(component.label)
                .setStyle(component.style);
              
              if (component.emoji) {
                if (typeof component.emoji === 'string') {
                  newButton.setEmoji(component.emoji);
                } else if (component.emoji.name) {
                  newButton.setEmoji(component.emoji.name);
                }
              }
              
              newRow.addComponents(newButton);
            }
          }
          newComponents.push(newRow);
        }

        // 在隐藏搜索结果时，只保留第一个处理后的embed
        console.log('Hiding search results');
        await interaction.update({ embeds: [newEmbed], components: newComponents });
      }
    } catch (error) {
      console.error('Error in showSearchResults button:', error);
      // 记录更详细的错误信息，帮助诊断
      console.error('Error details:', {
        customId: interaction.customId,
        embedsCount: interaction.message.embeds.length,
        hasComponents: !!interaction.message.components,
        guildId: interaction.guild?.id || 'unknown'
      });
      
      // 如果交互还没有回复，发送错误消息
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: i18n.getString("commands.agent.buttonError", language) || "处理搜索结果时发生错误。",
          ephemeral: true
        });
      }
    }
  }
};
