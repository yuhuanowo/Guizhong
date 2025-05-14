const { EmbedBuilder } = require("discord.js");
const logger = require("../../utils/logger");
const config = require("../../config");
const i18n = require("../../utils/i18n");

module.exports = {
    name: "playerError",
    async execute(queue, error) {
        logger.error("A player error occurred whilst attempting to perform this action:");
        logger.error(error);

        try {
            queue.delete();
        } catch (err) {
            () => {};
        }

        // 获取服务器语言
        const guildId = queue.metadata?.client?.guild?.id;
        const language = guildId ? i18n.getServerLanguage(guildId) : i18n.supportedLanguages[0];

        const errEmbed = new EmbedBuilder();
        errEmbed.setDescription(i18n.getString("player.errors.playerErrorDescription", language));
        //詳細信息
        errEmbed.addFields([
            {
                name: i18n.getString("player.errors.errorLabel", language),
                value: `\`\`\`${error.message}\`\`\``,
            },
        ]);
        errEmbed.setTitle(i18n.getString("player.errors.playerErrorTitle", language));
        errEmbed.setColor(config.embedColour);

        queue.metadata.channel.send({ embeds: [errEmbed] });
        return;
    },
};
