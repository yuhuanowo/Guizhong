const yaml = require("js-yaml");
const fs = require("fs");
const path = require("path");
const logger = require("./utils/logger");

var config = {};

try {
    const configFile = yaml.load(fs.readFileSync(path.join(__dirname, "..", "config.yml")));

    config = {
        token: configFile.botToken ?? "",
        clientId: configFile.clientId ?? "",
        geniusKey: configFile.geniusApiKey ?? undefined,
        embedColour: configFile.embedColour ?? "#F44336",
        autocomplete: configFile.enableAutocomplete ?? true,
        stopEmoji: configFile.emojis.stop ?? "⏹",
        skipEmoji: configFile.emojis.skip ?? "⏭",
        queueEmoji: configFile.emojis.queue ?? "📜",
        pauseEmoji: configFile.emojis.pause ?? "⏯",
        lyricsEmoji: configFile.emojis.lyrics ?? "📜",
        backEmoji: configFile.emojis.back ?? "⏮",
        autoplayEmoji: configFile.emojis.autoplay ?? "🔁",
        shuffleEmoji: configFile.emojis.shuffle ?? "🔀",
        leaveOnEndDelay: configFile.player.leaveOnEndDelay ?? 300000,
        leaveOnStopDelay: configFile.player.leaveOnStopDelay ?? 300000,
        leaveOnEmptyDelay: configFile.player.leaveOnEmptyDelay ?? 300000,
        deafenBot: configFile.player.deafenBot ?? false,
        enableProxy: configFile.proxy.enable ?? false,
        proxyUrl: configFile.proxy.connectionUrl ?? "",
        useYouTubeCookie: configFile.cookies.useCustomCookie ?? false,
        youtubeCookie: configFile.cookies.youtubeCookie ?? "",
        status: configFile.status ?? "music",
        youtubeapikey: configFile.youtubeapikey ?? "",
        googleapikey: configFile.googleapikey ?? "",
        openaiapikey: configFile.openaiapikey ?? "",
        githubToken: configFile.githubToken ?? "",
        geminiApiKey: configFile.geminiApiKey ?? "",
        geminiApiKeys: configFile.geminiApiKeys ?? [],  // 支援多個 API Key 輪流
        ollamaEndpoint: configFile.ollamaEndpoint ?? "http://localhost:11434",
        groqApiKey: configFile.groqApiKey ?? "",
        openRouterApiKey: configFile.openRouterApiKey ?? "",
        zhipuApiKey: configFile.zhipuApiKey ?? "",
        cloudflareApiKey: configFile.cloudflareApiKey ?? "",
        cloudflareEndpoint: configFile.cloudflareEndpoint ?? "https://api.cloudflare.com/client/v4/images/generate",
        tavilyApiKey: configFile.tavilyApiKey ?? "",
        oauthTokens: configFile.oauthTokens ?? {},
        showYoutubeJSErrors: configFile.logging?.showYoutubeJSErrors ?? false,
        mongoURI: configFile.mongoURI ?? "",
        webUrl: configFile.webBaseUrl ?? "http://localhost:3000",
        webSecret: configFile.webSecret ?? "CHANGE_THIS_TO_A_SECURE_SECRET",
    };
} catch (e) {
    logger.error("Unable to parse config.yml. Please make sure it is valid YAML.");
    process.exit(1);
}

if (!config.token || config.token === "") {
    logger.error("Please supply a bot token in your configuration file.");
    process.exit(1);
}

if (!config.clientId || config.clientId === "") {
    logger.error("Please supply a client ID in your configuration file.");
    process.exit(1);
}

if (config.geniusKey === "") config.geniusKey = undefined;

if (typeof config.geniusKey === "undefined") {
    logger.warn("No Genius API key was provided. The lyrics functions will not be as reliable.");
}

if (config.enableProxy && (!config.proxyUrl || config.proxyUrl === "")) {
    logger.warn("You have enabled proxying, but have not provided a proxy URL. Proxying will be disabled.");
    config.enableProxy = false;
}

if (config.useYouTubeCookie && (!config.youtubeCookie || config.youtubeCookie === "")) {
    logger.warn("You have enabled using a custom YouTube cookie, but have not provided a cookie. Using a custom YouTube cookie will be disabled.");
    config.useYouTubeCookie = false;
}

module.exports = config;
