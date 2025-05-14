const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// 可用的语言
const supportedLanguages = ['en', 'zh-CN', 'zh-TW'];

// 默认语言
const defaultLanguage = 'en';

// 服务器语言设置缓存
const serverLanguages = {};

// 语言字符串缓存
const translations = {};

// 初始化语言文件
function loadTranslations() {
    for (const lang of supportedLanguages) {
        try {
            const filePath = path.join(__dirname, '..', 'locales', `${lang}.json`);
            const data = fs.readFileSync(filePath, 'utf8');
            translations[lang] = JSON.parse(data);
            logger.info(`Loaded language: ${lang}`);
        } catch (error) {
            logger.error(`Failed to load language file for ${lang}: ${error.message}`);
        }
    }
}

// 加载服务器语言设置
function loadServerLanguages() {
    try {
        const filePath = path.join(__dirname, '..', 'JSON', 'serverLanguages.json');
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            Object.assign(serverLanguages, JSON.parse(data));
            logger.info(`Loaded server language settings for ${Object.keys(serverLanguages).length} servers`);
        } else {
            // 如果文件不存在，创建一个空文件
            fs.writeFileSync(filePath, JSON.stringify({}));
            logger.info('Created empty server language settings file');
        }
    } catch (error) {
        logger.error(`Failed to load server language settings: ${error.message}`);
    }
}

// 保存服务器语言设置
function saveServerLanguages() {
    try {
        const filePath = path.join(__dirname, '..', 'JSON', 'serverLanguages.json');
        fs.writeFileSync(filePath, JSON.stringify(serverLanguages, null, 2));
    } catch (error) {
        logger.error(`Failed to save server language settings: ${error.message}`);
    }
}

// 获取服务器的语言设置
function getServerLanguage(guildId) {
    return serverLanguages[guildId] || defaultLanguage;
}

// 设置服务器的语言
function setServerLanguage(guildId, language) {
    if (!supportedLanguages.includes(language)) {
        throw new Error(`Unsupported language: ${language}`);
    }
    
    serverLanguages[guildId] = language;
    saveServerLanguages();
    return language;
}

// 获取翻译字符串
function getString(key, language, replacements = {}) {
    // 如果未指定语言，使用默认语言
    language = language || defaultLanguage;
    
    // 如果语言不受支持，回退到默认语言
    if (!translations[language]) {
        language = defaultLanguage;
    }
    
    // 通过键路径获取翻译字符串
    const keys = key.split('.');
    let value = translations[language];
    
    for (const k of keys) {
        if (value && value[k] !== undefined) {
            value = value[k];
        } else {
            // 如果找不到翻译，尝试从默认语言获取
            if (language !== defaultLanguage) {
                return getString(key, defaultLanguage, replacements);
            }
            logger.warn(`Translation key not found: ${key} (language: ${language})`);
            return key; // 回退到键名
        }
    }
    
    // 如果值不是字符串，则可能是一个嵌套对象，返回键名
    if (typeof value !== 'string') {
        return key;
    }
    
    // 替换占位符
    if (replacements && Object.keys(replacements).length > 0) {
        Object.keys(replacements).forEach(placeholder => {
            value = value.replace(new RegExp(`{${placeholder}}`, 'g'), replacements[placeholder]);
        });
    }
    
    return value;
}

// 初始化本地化系统
function initialize() {
    if (!fs.existsSync(path.join(__dirname, '..', 'JSON'))) {
        fs.mkdirSync(path.join(__dirname, '..', 'JSON'));
    }
    loadTranslations();
    loadServerLanguages();
    
    logger.info(`Localization system initialized with languages: ${supportedLanguages.join(', ')}`);
}

module.exports = {
    initialize,
    supportedLanguages,
    getServerLanguage,
    setServerLanguage,
    getString
};
