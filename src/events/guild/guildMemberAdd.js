//when a new member joins the server
const { EmbedBuilder, Colors } = require("discord.js");
const config = require("../../config");
const logger = require("../../utils/logger");

module.exports = {
    name: "guildMemberAdd",
    once: false,
    async execute(member, client) {
        //if message is sent by bot, return
        if (member.user.bot) return;
        logger.info(`[${member.guild.name}] ${member.user.tag} has joined the server`);
        // //send message to #welcome channel
        // const channel = member.guild.channels.cache.get("606104244101185561"); // Get the channel from ID
        // if (!channel) return logger.error(`Channel not found: CHANNEL_ID`); // Check if the channel exists
        // const embed = new EmbedBuilder()
        //     .setTitle("👋 Welcome to YuhuanStudio!")
        //     .setDescription(`Welcome to YuhuanStudio, ${member.user.tag}! Please read the rules in <#606104244101185562> and enjoy your stay!`)
        //     .setColor(config.embedColour)
        //     .setAuthor( { name: member.user.tag, iconURL: member.user.avatarURL })
        //     .setTimestamp();

        // channel.send({ embeds: [embed] }); // Send the message to the channel
    },
};
