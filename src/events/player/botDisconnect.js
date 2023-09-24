const { EmbedBuilder } = require("discord.js");
const config = require("../../config");

module.exports = {
    name: "disconnect",
    async execute(queue) {
        try {
            queue.delete();
        } catch (err) {
            () => {};
        }

        const embed = new EmbedBuilder();
        embed.setTitle("列隊已清空，離開語音頻道! ❌");
        embed.setColor(config.embedColour);

        queue.metadata.channel.send({ embeds: [embed] });
    },
};
