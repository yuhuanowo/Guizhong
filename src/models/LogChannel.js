const mongoose = require("mongoose");

// 创建日志频道设置的Schema
const LogChannelSchema = new mongoose.Schema({
    // 服务器ID
    guildId: {
        type: String,
        required: true,
        unique: true
    },
    // 日志频道ID
    channelId: {
        type: String,
        required: true
    },
    // 日志类型，可以是多种类型：message, voice, member, etc.
    logTypes: {
        message: {
            type: Boolean,
            default: true
        },
        voice: {
            type: Boolean,
            default: false
        },
        member: {
            type: Boolean,
            default: false
        },
        server: {
            type: Boolean,
            default: false
        }
    },
    // 创建日期
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// 创建和导出模型
module.exports = mongoose.model("LogChannel", LogChannelSchema);
