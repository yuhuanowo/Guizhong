
export const modelEmojiMap: Record<string, string> = {
  'gpt-4': '1402509357631017083',
  'gpt-4o': '1403243749236150435',
  'gpt-4o-mini': '1425123222902407198',
  'gpt-4.1': '1403243798536130642',
  'gpt-4.1-mini': '1425121129093267527',
  'gpt-4.1-nano': '1425121237142601749',
  'gpt-5': '1403242839214653603',
  'gpt-5-chat': '1425121355371905064',
  'gpt-5-mini': '1425121271242559569',
  'gpt-5-nano': '1425121335994224670',
  'gpt-oss': '1425121439773888644',
  'o1': '1425120921777213500',
  'o1-preview': '1425120996125446224',
  'o1-mini': '1425121008754626610',
  'o3': '1424711069770846321',
  'o3-mini': '1425121020469317703',
  'o4': '1403243776214040638',
  'llama': '1426094287652917353',
  'microsoft': '1426094300277768284',
  'qwen': '1427590458611204098',
  'deepseek': '1427590444497502281',
  'gemini': '1426093987156066334',
  'gemma': '1426121930192195627',
  'google': '1427590471613415474',
  'grok': '1427590430790254703',
  'groq': '1427590414566948924',
  'minimax': '1427590399681368175',
  'mistral': '1426094310356549632',
  'openai': '1427590485198770247',
  'cohere': '1427590384158117959',
  'github': '1427590369478184991',
  'openrouter': '1427590357318893669',
  'ollama': '1427590342751813673',
  'zhipu': '1426396289913983026',
};

export function getModelEmojiUrl(model: string): string | null {
  if (!model) return null;
  const lowerModel = model.toLowerCase();
  
  // Exact match
  if (modelEmojiMap[lowerModel]) {
    return `https://cdn.discordapp.com/emojis/${modelEmojiMap[lowerModel]}.png`;
  }

  // Fuzzy match
  for (const [key, id] of Object.entries(modelEmojiMap)) {
    if (lowerModel.includes(key)) {
      return `https://cdn.discordapp.com/emojis/${id}.png`;
    }
  }
  
  return null;
}
