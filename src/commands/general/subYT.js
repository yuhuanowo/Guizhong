/** 用於訂閱youtube頻道
 */
/** */
const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const { Player } = require('discord-player');
const config = require('../../config');
const fs = require('fs');
const axios = require('axios');


// 設定 JSON 文件的路徑
const subscriptionsPath = 'src/subscriptions.json';
const YOUTUBE_API_KEY = config.youtubeapikey;

// 讀取已訂閱的頻道列表
function loadSubscriptions() {
  try {
    const data = fs.readFileSync(subscriptionsPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading subscriptions:', error);
    return {};
  }
}

// 儲存已訂閱的頻道列表
function saveSubscriptions(subscriptions) {
  try {
    let data = JSON.stringify(subscriptions);
    fs.writeFileSync("src/subscriptions.json", data);
  } catch (error) {
    console.error('Error saving subscriptions:', error);
  }
}

// 接入 YouTube API，取得頻道名稱
async function subscribeToChannel(channelId) {
  const baseUrl = 'https://www.googleapis.com/youtube/v3/search';
  const params = {
    key: YOUTUBE_API_KEY,
    channelId: channelId,
    order: 'date',
    maxResults: 1,
    part: 'snippet',
    type: 'video, live',
  };

  try {
    const response = await axios.get(baseUrl, { params });
    //const videoId = response.data.items[0].id.videoId;
    //const videoTitle = response.data.items[0].snippet.title;
    const channelTitle = response.data.items[0].snippet.channelTitle;

    return {
      //videoId,
      //videoTitle,
      channelTitle,
    };
  } catch (error) {
    console.error('Error fetching YouTube data:', error);
    return null;
  }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('subscribe')
        .setDescription('(由於api問題現在只可訂閱)訂閱youtube頻道')
        .addStringOption(option => option.setName('channel_id').setDescription('輸入youtube頻道ID').setRequired(true)),

      //如果在對應的公會中，找不到輸入的頻道ID，則會在該公會中新增此頻道ID，並儲存到 subscriptions.json 中，並回覆訊息。
      //如果在對應的公會中，找到輸入的頻道ID，則會回覆訊息。
      async execute(interaction = CommandInteraction) {
        const channelId = interaction.options.getString('channel_id');
        //在subscriptions.json中讀取已訂閱的頻道列表
        const subscriptions = loadSubscriptions();
        let find = false;
        for (let i = 0; i < subscriptions.length; i++) {
          //如果在對應的公會中，找到輸入的頻道ID，則會回覆訊息。
          if (subscriptions[i].channelId === channelId && subscriptions[i].guild === interaction.guildId ) {
            find = true;
            await interaction.reply('此頻道已經被訂閱過了。');
            break;
          }
        }
        //如果沒有資料就創建一個新的並回覆結果
        if (find == false) {
        //創建新的玩家資料
        subscriptions.push({
          guild: interaction.guildId,
          channelId: channelId,
          sandchannel: interaction.channelId,
        });
          
          const result = await subscribeToChannel(channelId);    
          if (result) {
            subscriptions[channelId] = result;
            saveSubscriptions(subscriptions);
    
            await interaction.reply(`已訂閱頻道：${result.channelTitle}`);

          } else {
            await interaction.reply('訂閱時出現問題，請檢查頻道 ID 是否正確。');
          }
        }
      },
    };