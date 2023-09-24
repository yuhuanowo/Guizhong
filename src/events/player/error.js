const { EmbedBuilder } = require("discord.js");
const logger = require("../../utils/logger");
const config = require("../../config");

module.exports = {
    name: "error",
    async execute(queue, error) {
        logger.error("An unhandled player error occurred during runtime:");
        logger.error(error);

        try {
            queue.delete();
        } catch (err) {
            () => {};
        }

        const errEmbed = new EmbedBuilder();
        errEmbed.setDescription("嘗試執行此操作時發生錯誤。該媒體可能不受支持❌");
        errEmbed.setColor(config.embedColour);

        queue.metadata.channel.send({ embeds: [errEmbed] });
        return;
    },
};
