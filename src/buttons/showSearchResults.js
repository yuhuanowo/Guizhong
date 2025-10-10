const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require("discord.js");
const i18n = require("../utils/i18n");

// Discord Embed 限制常量
const MAX_EMBED_TOTAL_SIZE = 6000; // Discord 總 embed 大小限制
const MAX_FIELD_VALUE_LENGTH = 1024; // 單個字段值的最大長度
const MAX_EMBED_DESCRIPTION_LENGTH = 4096; // Embed 描述的最大長度

// 计算 embed 的總大小
function calculateEmbedSize(embed) {
  let size = 0;
  if (embed.title) size += embed.title.length;
  if (embed.description) size += embed.description.length;
  if (embed.footer?.text) size += embed.footer.text.length;
  if (embed.author?.name) size += embed.author.name.length;
  if (embed.fields) {
    embed.fields.forEach(field => {
      size += field.name.length + field.value.length;
    });
  }
  return size;
}

// 優化搜尋結果顯示,限制每個結果的長度
function formatSearchResultsOptimized(searchResults, maxTotalLength = 3000) {
  const formattedResults = [];
  let currentLength = 0;
  
  for (const result of searchResults) {
    // 限制標題長度
    const title = result.title.length > 100 
      ? result.title.substring(0, 97) + "..." 
      : result.title;
    
    // 限制內容片段長度
    const snippet = result.contentSnippet 
      ? (result.contentSnippet.length > 150 
          ? result.contentSnippet.substring(0, 147) + "..." 
          : result.contentSnippet)
      : "";
    
    // 移除 Markdown 粗體格式,保持字體大小統一
    const formattedResult = `${title}\n🔗 ${result.url}${snippet ? '\n📝 ' + snippet : ''}`;
    const resultLength = formattedResult.length + 2; // +2 for \n\n separator
    
    // 檢查是否會超過限制
    if (currentLength + resultLength > maxTotalLength) {
      // 如果是第一個結果就超過,至少添加一個縮短版本
      if (formattedResults.length === 0) {
        const shortTitle = result.title.substring(0, 50) + "...";
        formattedResults.push(`${shortTitle}\n🔗 ${result.url}`);
      }
      break;
    }
    
    formattedResults.push(formattedResult);
    currentLength += resultLength;
  }
  
  return {
    text: formattedResults.join('\n\n'),
    truncated: formattedResults.length < searchResults.length,
    displayedCount: formattedResults.length,
    totalCount: searchResults.length
  };
}

// 创建完整搜尋結果的文本文件
function createSearchResultsFile(searchResults, language) {
  let content = `搜尋結果 (共 ${searchResults.length} 個)\n`;
  content += `生成時間: ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}\n`;
  content += '='.repeat(80) + '\n\n';
  
  searchResults.forEach((result, index) => {
    content += `${index + 1}. ${result.title}\n`;
    content += `   網址: ${result.url}\n`;
    if (result.domain) {
      content += `   來源: ${result.domain}\n`;
    }
    if (result.contentSnippet) {
      content += `   摘要: ${result.contentSnippet}\n`;
    }
    content += '\n' + '-'.repeat(80) + '\n\n';
  });
  
  return Buffer.from(content, 'utf-8');
}

// 创建一个全局搜索结果缓存
const searchResultsCache = new Map();

module.exports = {
  name: "showSearchResults",
  searchResultsCache, // 导出缓存供其他模块使用
  formatSearchResultsOptimized,
  createSearchResultsFile,
  calculateEmbedSize,
  async execute(interaction) {
    try {
      console.log('showSearchResults executed with customId:', interaction.customId);
      console.log('Message embeds count:', interaction.message.embeds.length);
      
      // 處理 showSearchResults 和 hideSearchResults 兩種按鈕
      if (!interaction.customId.startsWith("showSearchResults_") && 
          !interaction.customId.startsWith("hideSearchResults_")) {
        return;
      }

  const guildId = interaction.guild.id;
  let language = i18n.getServerLanguage(guildId);
      
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
            content: i18n.getString("commands.agent.searchResultsExpired", language),
            ephemeral: true
          });
          return;
        }

        const newEmbed = EmbedBuilder.from(embed);
        
        // 優化格式化搜尋結果
        const { text: searchResultsText, truncated, displayedCount, totalCount } = 
          formatSearchResultsOptimized(searchResults, 3800); // 為獨立 embed 預留更多空間
        
        // 創建獨立的搜尋結果 embed
        const searchEmbed = new EmbedBuilder()
          .setTitle(`🔍 ${i18n.getString("commands.agent.searchResults", language)} (${totalCount} 個)`)
          .setColor("#5865F2")
          .setTimestamp();
        
        // 檢查是否需要使用文件
        const needsFile = searchResultsText.length > MAX_EMBED_DESCRIPTION_LENGTH;
        
        if (needsFile) {
          // 內容過長,使用文件
          // 在 embed 中顯示前幾個結果的摘要
          const summaryResults = searchResults.slice(0, 3).map((r, i) => 
            `${i + 1}. ${r.title.substring(0, 80)}${r.title.length > 80 ? '...' : ''}\n` +
            `🔗 ${r.url}\n` +
            `${r.contentSnippet ? '📝 ' + r.contentSnippet.substring(0, 120) + (r.contentSnippet.length > 120 ? '...' : '') : ''}`
          ).join('\n\n');
          
          searchEmbed.setDescription(
            `找到 ${totalCount} 個結果，內容過長已生成完整文件。\n\n` +
            `前 3 個結果預覽:\n\n${summaryResults}\n\n` +
            `📎 完整搜尋結果已以文件形式發送，請查看下方附件。`
          );
          
          // 重新创建按钮组件
          const newComponents = [];
          if (interaction.message.components && interaction.message.components[0]) {
            const newRow = new ActionRowBuilder();
            const seen = new Set();

            for (const component of interaction.message.components[0].components) {
              const compId = component.customId || component.custom_id || null;
              // Skip duplicates from the original message
              if (compId && seen.has(compId)) continue;

              if (compId === `showSearchResults_${messageId}`) {
                const newButton = new ButtonBuilder()
                  .setCustomId(`hideSearchResults_${messageId}`)
                  .setLabel(i18n.getString("commands.agent.hideSearchResults", language))
                  .setStyle(ButtonStyle.Secondary);

                if (component.emoji) {
                  if (typeof component.emoji === 'string') {
                    newButton.setEmoji(component.emoji);
                  } else if (component.emoji.name) {
                    newButton.setEmoji(component.emoji.name);
                  }
                }

                newRow.addComponents(newButton);
                seen.add(`hideSearchResults_${messageId}`);
              } else {
                // Preserve other buttons but avoid duplicate customIds
                const targetId = compId || `btn_${Math.random().toString(36).slice(2,8)}`;
                if (seen.has(targetId)) continue;

                const newButton = new ButtonBuilder()
                  .setCustomId(targetId)
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
                seen.add(targetId);
              }
            }

            // 在按鈕行末尾加入下載按鈕（如果尚未存在）
            const downloadId = `downloadSearchResults_${messageId}`;
            if (!seen.has(downloadId)) {
              const downloadButton = new ButtonBuilder()
                .setCustomId(downloadId)
                .setLabel(i18n.getString("commands.agent.downloadSearchResults", language))
                .setStyle(ButtonStyle.Primary);
              newRow.addComponents(downloadButton);
              seen.add(downloadId);
            }

            newComponents.push(newRow);
          }
          
          // 先更新原消息添加搜尋結果 embed
          await interaction.update({ 
            embeds: [newEmbed, searchEmbed], 
            components: newComponents
          });
          
          // 不自動上傳文件，改為提供下載按鈕（使用者按下後由 downloadSearchResults 處理）
          return;
        }
        
        // 內容不長,直接在獨立 embed 中顯示
        let description = searchResultsText;
        if (truncated) {
          description += `\n\n_顯示 ${displayedCount}/${totalCount} 個結果_`;
        }
        
        searchEmbed.setDescription(description);

        // 重新创建按钮组件
        const newComponents = [];
        if (interaction.message.components && interaction.message.components[0]) {
          const newRow = new ActionRowBuilder();
          const seen = new Set();

          for (const component of interaction.message.components[0].components) {
            const compId = component.customId || component.custom_id || null;
            if (compId && seen.has(compId)) continue;

            if (compId === `showSearchResults_${messageId}`) {
                const newButton = new ButtonBuilder()
                .setCustomId(`hideSearchResults_${messageId}`)
                .setLabel(i18n.getString("commands.agent.hideSearchResults", language))
                .setStyle(ButtonStyle.Secondary);

              if (component.emoji) {
                if (typeof component.emoji === 'string') {
                  newButton.setEmoji(component.emoji);
                } else if (component.emoji.name) {
                  newButton.setEmoji(component.emoji.name);
                }
              }

              newRow.addComponents(newButton);
              seen.add(`hideSearchResults_${messageId}`);
            } else {
              const targetId = compId || `btn_${Math.random().toString(36).slice(2,8)}`;
              if (seen.has(targetId)) continue;

              const newButton = new ButtonBuilder()
                .setCustomId(targetId)
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
              seen.add(targetId);
            }
          }

          // 在按鈕行末尾加入下載按鈕（如果尚未存在）
          const downloadId = `downloadSearchResults_${messageId}`;
          if (!seen.has(downloadId)) {
            const downloadButton2 = new ButtonBuilder()
              .setCustomId(downloadId)
              .setLabel(i18n.getString("commands.agent.downloadSearchResults", language))
              .setStyle(ButtonStyle.Primary);
            newRow.addComponents(downloadButton2);
            seen.add(downloadId);
          }

          newComponents.push(newRow);
        }

        // 顯示原 embed 和搜尋結果 embed
        await interaction.update({ embeds: [newEmbed, searchEmbed], components: newComponents });
      } else if (interaction.customId.startsWith("hideSearchResults_")) {
        // 隱藏搜尋結果 embed,只保留原始 embed
        const newEmbed = EmbedBuilder.from(embed);

        // 始终只使用第一个embed（不包含搜索结果）
        // 忽略任何可能存在的第二个embed（带有完整搜索结果的embed）
        
        // 重新创建按钮组件
        const newComponents = [];
        if (interaction.message.components && interaction.message.components[0]) {
          const newRow = new ActionRowBuilder();
          const seen = new Set();

          for (const component of interaction.message.components[0].components) {
            const compId = component.customId || component.custom_id || null;
            // Skip download button when hiding search results
            if (compId && compId.startsWith('downloadSearchResults_')) continue;
            if (compId && seen.has(compId)) continue;

            if (compId === `hideSearchResults_${messageId}`) {
                const newButton = new ButtonBuilder()
                .setCustomId(`showSearchResults_${messageId}`)
                .setLabel(i18n.getString("commands.agent.showSearchResults", language))
                .setStyle(ButtonStyle.Secondary);

              if (component.emoji) {
                if (typeof component.emoji === 'string') {
                  newButton.setEmoji(component.emoji);
                } else if (component.emoji.name) {
                  newButton.setEmoji(component.emoji.name);
                }
              }

              newRow.addComponents(newButton);
              seen.add(`showSearchResults_${messageId}`);
            } else {
              const targetId = compId || `btn_${Math.random().toString(36).slice(2,8)}`;
              if (seen.has(targetId)) continue;

              const newButton = new ButtonBuilder()
                .setCustomId(targetId)
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
              seen.add(targetId);
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
          content: i18n.getString("commands.agent.buttonError", language),
          ephemeral: true
        });
      }
    }
  }
};
