const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const config = require("../../config");
const fs = require("fs");

module.exports = {
    data: new SlashCommandBuilder().setName("skip").setDescription("跳過當前歌曲").setDMPermission(false),
    async execute(interaction) {
        const player = Player.singleton();
        const queue = player.nodes.get(interaction.guild.id);

        const embed = new EmbedBuilder();
        embed.setColor(config.embedColour);

        if (!queue || !queue.isPlaying()) {
            embed.setTitle("當前沒有播放音樂... 再試一次 ? ❌");
            return await interaction.reply({ embeds: [embed] });
        }

        queue.node.skip();

        let rawdata = fs.readFileSync("src/data.json");
        var data = JSON.parse(rawdata);

        data["songs-skipped"] += 1;

        const success = queue.node.skip();

        embed.setTitle(success?`當前音樂 **${queue.currentTrack.title}** 已跳過✅`:"出了些問題... 再試一次 ? ❌");

        let newdata = JSON.stringify(data);
        fs.writeFileSync("src/data.json", newdata);

        return await interaction.reply({ embeds: [embed] });
    },
};
