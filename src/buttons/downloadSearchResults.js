const { AttachmentBuilder } = require('discord.js');
const showSearch = require('./showSearchResults');
const i18n = require('../utils/i18n');

module.exports = {
  name: 'downloadSearchResults',
  async execute(interaction) {
    try {
      if (!interaction.customId.startsWith('downloadSearchResults_')) return;
      const messageId = interaction.customId.split('_')[1];
      const language = i18n.getServerLanguage(interaction.guild?.id || interaction.user.id);

      const searchResults = showSearch.searchResultsCache.get(messageId);
      if (!searchResults || searchResults.length === 0) {
        return await interaction.reply({ content: i18n.getString('commands.agent.searchResultsExpired', language), ephemeral: true });
      }

      // 使用 showSearch 的 createSearchResultsFile
      const fileBuffer = showSearch.createSearchResultsFile
        ? showSearch.createSearchResultsFile(searchResults, language)
        : null;

      if (!fileBuffer) {
        return await interaction.reply({ content: i18n.getString('commands.agent.downloadError', language), ephemeral: true });
      }

      const attachment = new AttachmentBuilder(fileBuffer, { name: `search_results_${messageId}.txt` });

      // 回覆使用者並附上檔案
  await interaction.reply({ content: i18n.getString('commands.agent.downloadedResultsMessage', language).replace('{count}', `${searchResults.length}`), files: [attachment] });
    } catch (error) {
      console.error('Error in downloadSearchResults:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '下載搜尋結果時發生錯誤。', ephemeral: true });
      }
    }
  }
};
