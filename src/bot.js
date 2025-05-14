// 在 discord-player v7 中，mediaplex 已预安装，不再需要强制使用 play-dl
process.env["DP_FORCE_YTDL_MOD"] = "play-dl";

const { Player } = require("discord-player");
const { Client, Collection, GatewayIntentBits } = require("discord.js");
const { SpotifyExtractor, SoundCloudExtractor, AppleMusicExtractor, VimeoExtractor, AttachmentExtractor, ReverbnationExtractor, DefaultExtractors } = require("@discord-player/extractor");
const { YoutubeiExtractor, createYoutubeiStream } = require("discord-player-youtubei");
const HttpsProxyAgent = require("https-proxy-agent");
const fs = require("node:fs");
const logger = require("./utils/logger");
const config = require("./config");
const { IntentsBitField } = require("discord.js");
const yaml = require("js-yaml");
const path = require("path");
const configFile = yaml.load(fs.readFileSync(path.join(__dirname, "..", "config.yml")));

process.on("unhandledRejection", (reason) => {
    logger.error("An unhandled rejection occurred in the main process:");
    logger.error(reason.stack ? `${reason.stack}` : `${reason}`);
});

process.on("uncaughtException", (err) => {
    logger.error("An uncaught exception occurred in the main process:");
    logger.error(err.stack ? `${err.stack}` : `${err}`);
});

process.on("uncaughtExceptionMonitor", (err) => {
    logger.error("An uncaught exception monitor occurred in the main process:");
    logger.error(err.stack ? `${err.stack}` : `${err}`);
});

process.on("beforeExit", (code) => {
    logger.error("The process is about to exit with code: " + code);
});

process.on("exit", (code) => {
    logger.error("The process exited with code: " + code);
});

if (!fs.existsSync("config.yml")) {
    logger.error("Unable to find config.yml file. Please copy the default configuration into a file named config.yml in the root directory. (The same directory as package.json)");
    process.exit(1);
}

if (!fs.existsSync("src/JSON/data.json")) {
    logger.warn("Unable to find data.json file. Creating a new one with default values.");
    fs.writeFileSync("src/JSON/data.json", JSON.stringify({ "songs-played": 0, "queues-shuffled": 0, "songs-skipped": 0 }));
}

let proxy = null;
let agent = null;

if (config.enableProxy) {
    proxy = config.proxyUrl;
    agent = HttpsProxyAgent(proxy);
}

const client = new Client({ intents: [GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessageTyping, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages, GatewayIntentBits.DirectMessageReactions, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.DirectMessageTyping, GatewayIntentBits.GuildPresences, GatewayIntentBits.MessageContent] });
const player = new Player(client, { autoRegisterExtractor: false, ytdlOptions: { requestOptions: { agent, headers: { cookie: config.useYouTubeCookie ? config.youtubeCookie : null } } } });
// 注意：YouTubeExtractor 在 v7 中已被移除
// 为 YoutubeiExtractor 进行单独配置
// 如果需要使用 YoutubeiExtractor，请取消以下注释并配置相应参数

/*
// 注册 YoutubeiExtractor 替代官方的 YouTubeExtractor
(async () => {
    try {
        const oauthTokens = configFile.oauthTokens || {};
        await player.extractors.register(YoutubeiExtractor, {
            authentication: {
                access_token: configFile.YT_ACCESS_TOKEN || '',
                refresh_token: configFile.YT_REFRESH_TOKEN || '',
                scope: "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtubepartner https://www.googleapis.com/auth/youtube",
                token_type: 'Bearer',
                expires_in: 3599,
            },
            generateWithPoToken: false,
            streamOptions: {
                useClient: "WEB"
            }
        });
        logger.info("YoutubeiExtractor 已成功注册");
    } catch (error) {
        logger.error("YoutubeiExtractor 注册失败:", error);
    }
})();
*/



// 加载所有默认提取器，但我们将单独注册 YoutubeiExtractor
const extractorsToLoad = [
    SpotifyExtractor,
    SoundCloudExtractor,
    AppleMusicExtractor,
    VimeoExtractor,
    ReverbnationExtractor,
    AttachmentExtractor
];

// 注册所有提取器
(async () => {
    try {
        await player.extractors.loadMulti(extractorsToLoad);
        logger.info("所有音乐提取器已成功加载");
        
        // 尝试启用 YoutubeiExtractor 来解决 YouTube 视频无法播放的问题
        try {
            await player.extractors.register(YoutubeiExtractor, {
            });
            logger.info("YoutubeiExtractor 已注册，可能能够播放 YouTube 内容");
        } catch (ytError) {
            logger.warn("无法注册 YoutubeiExtractor，YouTube 视频可能无法播放：", ytError.message);
        }
    } catch (error) {
        logger.error("加载音乐提取器时出错：", error);
    }
})();

client.commands = new Collection();
client.buttons = new Collection();

const functions = fs.readdirSync("./src/functions").filter((file) => file.endsWith(".js"));
const mongoose = require("mongoose");

(async () => {
    logger.info("Initialising Guizhong...");
    
    // 初始化本地化系统
    const i18n = require('./utils/i18n');
    i18n.initialize();
    
    // 連接到 MongoDB 資料庫
    try {
        await mongoose.connect(config.mongoURI || "mongodb://localhost:27017/bot");
        logger.success("Successfully connected to MongoDB database");
        
        // 載入所有模型文件
        const modelsPath = path.join(__dirname, "models");
        if (fs.existsSync(modelsPath)) {
            const modelFiles = fs.readdirSync(modelsPath).filter(file => file.endsWith(".js"));
            modelFiles.forEach(file => {
                require(path.join(modelsPath, file));
                logger.info(`Loaded model: ${file}`);
            });
        }
    } catch (err) {
        logger.error("Failed to connect to MongoDB database:", err);
    }
    
    for (var file of functions) {
        require(`./functions/${file}`)(client);
    }

    // //初始化langchainhistory.json成空白
    // const langchainhistory = [
    //     {
    //         role: "user",
    //         content: "",
    //     },
    //     {
    //         role: "assistant",
    //         content: "",
    //     },
    // ];
    // fs.writeFileSync("./src/JSON/langchainhistory.json", JSON.stringify(langchainhistory));

    client.handleCommands();
    client.handleEvents();
    client.handleButtons();
    logger.info("Logging into Discord client...");
    await client.login(config.token);
    logger.success(`Logged in as ${client.user.username}#${client.user.discriminator} (${client.user.id})`);
})();
