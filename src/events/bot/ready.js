const logger = require("../../utils/logger");
const config = require("../../config");
const { Activity, ActivityType } = require("discord.js");
const axios = require('axios');
const fs = require('fs');





// 設定 JSON 文件的路徑
const subscriptionsPath = 'src/subscriptions.json';
const YOUTUBE_API_KEY = config.youtubeapikey;
const checkpath = 'src/checkYTtemp.json';

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

//讀取已發送過的直播或影片
function loadCheck() {
    try {
        const datacheck = fs.readFileSync(checkpath, 'utf8');
        return JSON.parse(datacheck);
    } catch (error) {
        console.error('Error loading check:', error);
        return {};
    }
}

//將剛剛發送過的直播或影片記錄下來
function saveCheck(check) {
    try {
        let datacheck = JSON.stringify(check);
        fs.writeFileSync("src/checkYTtemp.json", datacheck);
    } catch (error) {
        console.error('Error saving check:', error);
    }
}

//檢查checkYTtemp.json是否有內容，如果沒有，則建立一個空的JSON
function checkCheck(videoId,channelId) {
    const checkjson = loadCheck();
    let find = false;
        for (let i = 0; i < checkjson.length; i++) {
          //如果在對應的公會中，找到輸入的頻道ID，則會回覆訊息。
          if (checkjson[i].videoId === videoId && checkjson[i].channelId === channelId) {
            find = true;
            return true;
          }
            if (!checkjson[i].videoId === videoId && checkjson[i].channelId === channelId) {
            //有新的影片 或 直播 刪除舊的資料
                checkjson.shift(i);
            //創建新的暫存資料
                checkjson.push({
                    videoId: videoId,
                    channelId: channelId,
                });
            //儲存
                saveCheck(checkjson);
                return false;
            }
        }
        //如果沒有資料就創建一個新的並回覆結果
        if (find == false) {
        //創建新的暫存資料
        checkjson.push({
            videoId: videoId,
            channelId: channelId,
        });
        //儲存 
        saveCheck(checkjson);
        return false;

        }
}


// 獲取頻道的最新影片或直播
async function getLatestContent(channelId) {
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
        const items = response.data.items;
        if (items.length > 0) {
            const videoId = response.data.items[0].id.videoId;
            const videoTitle = response.data.items[0].snippet.title;
            const channelTitle = response.data.items[0].snippet.channelTitle;
            const isLive = items[0].snippet.liveBroadcastContent === 'live';

            return {
                videoId,
                videoTitle,
                channelTitle,
                isLive,
            };
        } else {
            return ;
        }
    } catch (error) {
        logger.error('Error getting channel information:', error);
    }
}



 
// 檢查頻道是否有新影片或直播
  async function checkForNewContent() {
    const subscriptions = loadSubscriptions();
    //檢查subscriptions.json是否有內容
    if (!Object.keys(subscriptions).length) {
      logger.info('沒有訂閱任何頻道。');
        return;
    }
    else {
    //檢查是否有公會訂閱了頻道，有的話，逐一檢查是否有新影片或直播
      for (let i = 0; i < subscriptions.length; i++) {
          const latestContent = await getLatestContent(subscriptions[i].channelId);
          if (latestContent) {
              if (latestContent.isLive )  {
                logger.info(`頻道有新的直播：${latestContent.videoTitle}`);
                //將以發送過的直播記錄下來，避免重複發送
                if (checkCheck(latestContent.videoId,latestContent.channelId) == true) {
                    logger.info('已經發送過了');
                }
                else {
                    logger.info('沒有發送過');
                
                }

                // 在這裡執行您的通知邏輯，例如發送到 Discord 伺服器
              } else {
                logger.info(`頻道有新的影片：${latestContent.videoTitle}`);
                if (checkCheck(latestContent.videoId,latestContent.channelId) == true) {
                    logger.info('已經發送過了');
                }
                else {
                    logger.info('沒有發送過');
                
                }
              // 在這裡執行您的通知邏輯，例如發送到 Discord 伺服器
              }
            } else {
              logger.info('沒有新的影片或直播。');
            }
          }
        }
      }  

module.exports = {
    name: "ready",
    once: true,
    async execute(client) {

        logger.success("Guizhong is now ready.");

        //檢查機器人是否在任何伺服器
        //如果沒有，則顯示邀請連結  如果有，則顯示機器人在多少伺服器
        if (client.guilds.cache.size === 0) {
            logger.warn(`Guizhong is not in any servers. Invite Guizhong to your server using the following link: https://discord.com/api/oauth2/authorize?client_id=${config.clientId}&permissions=274914887744&scope=bot%20applications.commands`);
        } else {
            logger.info(`Guizhong is in ${client.guilds.cache.size} ${client.guilds.cache.size === 1 ? "server" : "servers"}.`);
        }
        //設定機器人狀態
        client.user.setActivity(`/help | ${client.guilds.cache.size} servers`, { type: ActivityType.Listening });

        //檢查是否有新影片或直播 10mins檢查一次
        //setInterval(checkForNewContent, 6000);
        

    },
};
