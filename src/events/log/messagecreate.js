const { EmbedBuilder, Colors } = require("discord.js");
const config = require("../../config");
const logger = require("../../utils/logger");



//when message is sent in guild
module.exports = {
    name: "messageCreate",
    once: false,
    async execute(message,interaction, client,) {
        //if message is sent by bot, return
        if (message.author.bot) return;        
        logger.info(`[${message.guild.name}] ${message.author.tag} : ${message.content}`);
        
        // if (message.guild.id === "606104244101185558") {
        //     const channel = message.guild.channels.cache.get("764845795111338026"); // Get the channel from ID
        //     if (!channel) return logger.error(`Channel not found: CHANNEL_ID`); // Check if the channel exists
        //     const embed = new EmbedBuilder()
        //         .setTitle("🗑️ Message Deleted")
        //         .setDescription(`[${message.author.tag}] : ${message.content}`)
        //         .setColor(config.embedColour)
        //         .setAuthor( { name: message.author.tag, iconURL: message.author.avatarURL })
        //         .setTimestamp();
                
        //     channel.send({ embeds: [embed] }); // Send the message to the channel
        // }




        if (message.guild.id !== "606104244101185558") return; //for YuhuanStudio
            //if message content is "羽幻是拉拉隊長 (每日任務1/1)"
            if (
                message.content === "羽幻是拉拉隊長 (每日任務1/1)" ||
                message.content === "羽幻是拉拉隊長 (每日任務2/1)" ||
                message.content === "羽幻是拉拉隊長 (每日任務3/1)" ||
                message.content === "羽幻是老拉拉隊長 (每日任務1/1)" ||
                message.content === "羽幻是拉拉隊長"
            ) {
                //send message @傳送人 "你才是拉拉隊長"
                message.channel.send(`<@${message.author.id}>才是拉拉隊長`);
            }
        
    },

};
