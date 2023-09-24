const { EmbedBuilder } = require("discord.js");
const config = require("../../config");

module.exports = {
    name: "emptyChannel",
    async execute(queue) {
        try {
            queue.delete();
        } catch (err) {
            () => {};
        }

        const embed = new EmbedBuilder();

        embed.setTitle(`由於 ${formatMS(config.leaveOnEmptyDelay)} 不活動，音樂已停止`);
        embed.setColor(config.embedColour);

        queue.metadata.channel.send({ embeds: [embed] });
    },
};

function formatMS(ms) {
    var s = Math.floor(ms / 1000) % 60;
    var m = Math.floor(ms / (1000 * 60)) % 60;
    var h = Math.floor(ms / (1000 * 60 * 60));

    var str = "";

    if (h > 0) str += `${h} hour${h > 1 ? "s" : ""}`;
    if (h > 0 && m > 0) str += ", ";
    if (h > 0 && s > 0) str += " and ";
    if (m > 0) str += `${m} minute${m > 1 ? "s" : ""}`;
    if (m > 0 && s > 0) str += " and ";
    if (s > 0) str += `${s} second${s > 1 ? "s" : ""}`;

    return str;
}
