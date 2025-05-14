const { EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const config = require("../config");
const fs = require("fs");
const { useMainPlayer } = require("discord-player");
const i18n = require("../utils/i18n");

module.exports = {
    name: "shuffle_song",
    async execute(interaction) {
        const player = useMainPlayer();
        const queue = player.nodes.get(interaction.guild.id);
        const guildId = interaction.guild.id;
        const language = i18n.getServerLanguage(guildId);

        const embed = new EmbedBuilder();
        embed.setColor(config.embedColour);
        //等待時間刪除消息
        setTimeout(() => {
            interaction.deleteReply();
        }, 5000);

        if (!queue || !queue.isPlaying()) {
            embed.setTitle(i18n.getString("commands.autoplay.notPlaying", language));
            return await interaction.reply({ embeds: [embed] });
        }

        if (!queue.tracks.toArray()[0]) {
            embed.setTitle(i18n.getString("player.queue.notEnoughSongs", language));
            return await interaction.reply({ embeds: [embed] });
        }

        queue.tracks.shuffle();

        let rawdata = fs.readFileSync("src/JSON/data.json");
        var data = JSON.parse(rawdata);

        data["queues-shuffled"] += 1;

        let newdata = JSON.stringify(data);
        fs.writeFileSync("src/JSON/data.json", newdata);

        // 使用本地化字符串
        const shuffledMessage = i18n.getString("player.queue.shuffled", language, {
            count: queue.tracks.toArray().length
        });
        
        embed.setTitle(shuffledMessage);
        return await interaction.reply({ embeds: [embed] });
    },
};
