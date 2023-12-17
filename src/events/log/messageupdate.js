const { EmbedBuilder, Colors } = require("discord.js");
const config = require("../../config");
const logger = require("../../utils/logger");
const moment = require('moment'); //for time


//when message is delete in guild
module.exports = {
    name: "messageUpdate",
    once: false,
    async execute(message,interaction, client,oldMessage,newMessage) {

        const dateCreated = moment(message.createdAt).format('YYYY-MM-DD HH:mm:ss');


        //if message is sent by bot, return
        if (message.author.bot) return;
 
        if (message.guild.id == "606104244101185558") {
            // Get the channel to send the log message to
            const channel = message.guild.channels.cache.get("764845795111338026");
        
            // Check if both oldMessage and newMessage are defined
            if (!oldMessage || !newMessage) return;

            // Check if the message content is the same
            if (oldMessage.content === newMessage.content) return;

            // Create an embed for the log message
            const embed = new MessageEmbed()
                .setTitle('✏️ Message Edited')
                .setDescription(`${oldMessage.author} : ${oldMessage.content}\n\n(At ${dateCreated}, In <#${oldMessage.channel.id}>)`)
                .setColor(config.embedColour)
                .setAuthor({ name: oldMessage.author.tag, iconURL: oldMessage.author.avatarURL() })
                .setTimestamp()
                .setFooter({ text: 'Message ID: ' + oldMessage.id });

            // Send the log message to the channel
            channel.send({ embeds: [embed] });

}
}
}
