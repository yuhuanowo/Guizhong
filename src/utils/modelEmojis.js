/**
 * LLM 模型 Emoji 映射表
 * 用於在 Discord Embed 中顯示對應的模型圖示
 */

const modelEmojiMap = {
  'gpt-4': '<:gpt_4:1402509357631017083>',
  'gpt-4o': '<:gpt4o:1403243749236150435>',
  'gpt-4o-mini': '<:gpt4omini:1425123222902407198>',
  'gpt-4.1': '<:gpt4_1:1403243798536130642>',
  'gpt-4.1-mini': '<:gpt41mini:1425121129093267527>',
  'gpt-4.1-nano': '<:gpt41nano:1425121237142601749>',
  'gpt-5': '<:gpt5:1403242839214653603>',
  'gpt-5-chat': '<:gpt5chat:1425121355371905064>',
  'gpt-5-mini': '<:gpt5mini:1425121271242559569>',
  'gpt-5-nano': '<:gpt5nano:1425121335994224670>',
  'gpt-oss': '<:gptoss20b:1425121439773888644>',
  'o1': '<:o1:1425120921777213500>',
  'o1-preview': '<:o1preview:1425120996125446224>',
  'o1-mini': '<:o1mini:1425121008754626610>',
  'o3': '<:o3:1424711069770846321>',
  'o3-mini': '<:o3mini:1425121020469317703>',
  'o4': '<:o4mini:1403243776214040638>',
  'llama': '<:meta:1426094287652917353>',
  'microsoft': '<:microsoft:1426094300277768284>',
  'qwen': '<:qwen:1427590458611204098>',
  'deepseek': '<:deepseek:1427590444497502281>',
  'gemini': '<:gemini:1426093987156066334>',
  'gemma': '<:gemini:1426121930192195627>',
  'google': '<:google:1427590471613415474>',
  'grok': '<:grok:1427590430790254703>',
  'groq': '<:groq:1427590414566948924>',
  'minimax': '<:minimax:1427590399681368175>',
  'mistral': '<:mistral:1426094310356549632>',
  'openai': '<:openai:1427590485198770247>',
  'cohere': '<:cohere:1427590384158117959>',
  'github': '<:github:1427590369478184991>',
  'openrouter': '<:openrouter:1427590357318893669>',
  'ollama': '<:ollama:1427590342751813673>',
  'zhipu': '<:zhipu:1426396289913983026>',
};

/**
 * 根據模型名稱和提供商類型獲取對應的 Emoji
 * @param {string} model - 模型名稱
 * @param {string} providerType - 提供商類型
 * @returns {string} 對應的 Emoji 字符串，如果找不到則返回空字符串
 */
function getModelEmoji(model, providerType) {
  if (!model) return '';
  const lowerModel = model.toLowerCase();

  // 1) 優先精確匹配完整模型名
  if (modelEmojiMap[lowerModel]) return modelEmojiMap[lowerModel];

  // 2) 再找同系列（以前綴匹配為主），選擇最長的匹配鍵以取得最精確的系列
  const candidates = Object.keys(modelEmojiMap).filter(key => {
    // 忽略空鍵與 providerType 鍵
    if (!key) return false;
    const k = key.toLowerCase();
    return lowerModel.startsWith(k) || k.startsWith(lowerModel);
  });

  if (candidates.length > 0) {
    // 選最長的 key（更具體）
    candidates.sort((a, b) => b.length - a.length);
    return modelEmojiMap[candidates[0]];
  }

  // 3) 最後嘗試 providerType 作為備援
  if (providerType && modelEmojiMap[providerType]) return modelEmojiMap[providerType];

  return '';
}

/**
 * 獲取 Emoji URL（用於 setAuthor 的 iconURL）
 * Discord 自定義 emoji 格式: https://cdn.discordapp.com/emojis/{emoji_id}.png
 * @param {string} emoji - Emoji 字符串（格式: <:name:id>）
 * @returns {string} Emoji 的 CDN URL，如果格式不正確則返回 null
 */
function getEmojiUrl(emoji) {
  if (!emoji) return null;
  
  // 匹配 Discord emoji 格式: <:name:id> 或 <a:name:id>
  const match = emoji.match(/<a?:[\w]+:(\d+)>/);
  if (match && match[1]) {
    return `https://cdn.discordapp.com/emojis/${match[1]}.png`;
  }
  
  return null;
}

module.exports = {
  modelEmojiMap,
  getModelEmoji,
  getEmojiUrl
};
