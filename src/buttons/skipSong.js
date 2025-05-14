const { EmbedBuilder } = require("discord.js");
const fs = require("node:fs");
const { Player } = require("discord-player");
const config = require("../config");
const { useMainPlayer } = require("discord-player");
const i18n = require("../utils/i18n");

module.exports = {
    name: "skip_song",
    async execute(interaction) {
        const player = useMainPlayer();
        const queue = player.nodes.get(interaction.guild.id);
        const guildId = interaction.guild.id;
        const language = i18n.getServerLanguage(guildId);

        const embed = new EmbedBuilder();
        embed.setColor(config.embedColour);

        if (!queue || !queue.isPlaying()) {
            embed.setDescription(i18n.getString("common.notPlaying", language));
            //等待時間刪除消息
            setTimeout(() => {
                interaction.deleteReply();
            }, 5000);
            return await interaction.reply({
                embeds: [embed],
                ephemeral: true,
            });
        }

        const currentTrack = queue.currentTrack;
        queue.node.skip();

        let rawdata = fs.readFileSync("src/JSON/data.json");
        var data = JSON.parse(rawdata);

        data["songs-skipped"] += 1;

        const skipSuccessText = i18n.getString("player.skipSuccess", language, {
            user: `<@${interaction.user.id}>`,
            title: currentTrack.title,
        });
        embed.setDescription(skipSuccessText);

        let newdata = JSON.stringify(data);
        fs.writeFileSync("src/JSON/data.json", newdata);
        //等待時間刪除消息
        setTimeout(() => {
            interaction.deleteReply();
        }, 5000);

        return await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
