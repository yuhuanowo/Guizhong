const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const i18n = require("../utils/i18n");

// 创建一个全局思考内容缓存
const thinkContentCache = new Map();

module.exports = {
  name: "showThink",
  thinkContentCache, // 导出缓存供其他模块使用
  async execute(interaction) {
    try {
      console.log('showThink executed with customId:', interaction.customId);
      
      if (!interaction.customId.startsWith("showThink_") && !interaction.customId.startsWith("hideThink_")) {
        return;
      }

      const guildId = interaction.guild.id;
      const language = i18n.getServerLanguage(guildId);
      
      // 获取原始消息
      const embed = interaction.message.embeds[0];
      if (!embed) return;

      const messageId = interaction.customId.split("_")[1];
      
      // 从缓存中获取思考内容
      const thinkContent = thinkContentCache.get(messageId);
      
      if (interaction.customId.startsWith("showThink_")) {
        // 如果缓存中没有思考内容，说明缓存已过期
        if (!thinkContent || !thinkContent.trim()) {
          await interaction.reply({
            content: i18n.getString("commands.agent.thinkContentExpired", language) || "思考内容已过期。",
            ephemeral: true
          });
          return;
        }
        
        const newEmbed = EmbedBuilder.from(embed);
        
        // 在嵌入中添加思考过程字段
        newEmbed.spliceFields(0, 0, {
          name: i18n.getString("commands.agent.think", language),
          value: thinkContent,
          inline: false
        });

        // 重新创建按钮组件
        const newComponents = [];
        if (interaction.message.components && interaction.message.components[0]) {
          const newRow = new ActionRowBuilder();
          
          for (const component of interaction.message.components[0].components) {
            if (component.customId === `showThink_${messageId}`) {
              // 更新思考按钮为隐藏按钮
              const newButton = new ButtonBuilder()
                .setCustomId(`hideThink_${messageId}`)
                .setLabel(i18n.getString("commands.agent.hideThink", language))
                .setStyle(ButtonStyle.Secondary);
              
              // 保持原有的emoji
              if (component.emoji) {
                newButton.setEmoji(component.emoji);
              }
              
              newRow.addComponents(newButton);
            } else {
              // 保持其他按钮不变
              const newButton = new ButtonBuilder()
                .setCustomId(component.customId)
                .setLabel(component.label)
                .setStyle(component.style);
              
              if (component.emoji) {
                newButton.setEmoji(component.emoji);
              }
              
              newRow.addComponents(newButton);
            }
          }
          newComponents.push(newRow);
        }

        await interaction.update({ embeds: [newEmbed], components: newComponents });
        
      } else if (interaction.customId.startsWith("hideThink_")) {
        const newEmbed = EmbedBuilder.from(embed);
        
        // 移除第一个字段（思考过程）
        newEmbed.spliceFields(0, 1);

        // 重新创建按钮组件
        const newComponents = [];
        if (interaction.message.components && interaction.message.components[0]) {
          const newRow = new ActionRowBuilder();
          
          for (const component of interaction.message.components[0].components) {
            if (component.customId === `hideThink_${messageId}`) {
              // 更新隐藏按钮为显示按钮
              const newButton = new ButtonBuilder()
                .setCustomId(`showThink_${messageId}`)
                .setLabel(i18n.getString("commands.agent.openThink", language))
                .setStyle(ButtonStyle.Secondary);
              
              // 保持原有的emoji
              if (component.emoji) {
                newButton.setEmoji(component.emoji);
              }
              
              newRow.addComponents(newButton);
            } else {
              // 保持其他按钮不变
              const newButton = new ButtonBuilder()
                .setCustomId(component.customId)
                .setLabel(component.label)
                .setStyle(component.style);
              
              if (component.emoji) {
                newButton.setEmoji(component.emoji);
              }
              
              newRow.addComponents(newButton);
            }
          }
          newComponents.push(newRow);
        }

        await interaction.update({ embeds: [newEmbed], components: newComponents });
      }
    } catch (error) {
      console.error('Error in showThink button:', error);
      
      // 如果交互还没有回复，发送错误消息
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: i18n.getString("commands.agent.buttonError", language) || "处理思考内容时发生错误。",
          ephemeral: true
        });
      }
    }
  }
};
