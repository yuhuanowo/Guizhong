const { EmbedBuilder, Colors } = require("discord.js");
const config = require("../../config");
const logger = require("../../utils/logger");


//when message is delete in guild
module.exports = {
    name: "messageDelete",
    once: false,
    async execute(message,interaction, client,) {

        //if message is sent by bot, return
        if (message.author.bot) return;


        // Get the channel to send the log message to
        const channel = message.guild.channels.cache.get("764845795111338026");;
        // Create an embed for the log message
        const embed = new EmbedBuilder()
                .setTitle("🗑️ Message Deleted")
                .setDescription(`[${message.author.tag}] : ${message.content}`)
                .setColor(config.embedColour)
                .setAuthor({ name: message.author.tag, iconURL: message.author.avatarURL() })
                .setTimestamp();

        // Send the log message to the channel
        channel.send({ embeds: [embed] });

        }
}


