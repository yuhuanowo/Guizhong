// hideSearchResults 按鈕處理 - 轉發到 showSearchResults
const showSearchResults = require("./showSearchResults");

module.exports = {
  name: "hideSearchResults",
  async execute(interaction) {
    // 直接使用 showSearchResults 的處理邏輯
    return await showSearchResults.execute(interaction);
  }
};
