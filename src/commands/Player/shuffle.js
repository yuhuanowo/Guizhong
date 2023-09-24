const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const config = require("../../config");
const fs = require("fs");

module.exports = {
    data: new SlashCommandBuilder().setName("shuffle").setDescription("隨機播放歌曲").setDMPermission(false),
    async execute(interaction) {
        const player = Player.singleton();
        const queue = player.nodes.get(interaction.guild.id);

        const embed = new EmbedBuilder();
        embed.setColor(config.embedColour);

        if (!queue || !queue.isPlaying()) {
            embed.setTitle("當前沒有播放音樂... 再試一次 ? ❌");
            return await interaction.reply({ embeds: [embed] });
        }

        if (!queue.tracks.toArray()[0]) {
            embed.setTitle("列隊中沒有兩首以上的音樂... 再試一次 ? ❌");
            return await interaction.reply({ embeds: [embed] });
        }

        queue.tracks.shuffle();

        let rawdata = fs.readFileSync("src/data.json");
        var data = JSON.parse(rawdata);

        data["queues-shuffled"] += 1;

        let newdata = JSON.stringify(data);
        fs.writeFileSync("src/data.json", newdata);

        embed.setTitle(queue.tracks.length === 1 ? `隊列已打亂 **${queue.tracks.toArray().length} 首歌! ✅**!` : `隊列已打亂 **${queue.tracks.toArray().length} 首歌! ✅**!`);
        return await interaction.reply({ embeds: [embed] });
    },
};
