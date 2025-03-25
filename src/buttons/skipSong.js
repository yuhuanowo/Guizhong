const { EmbedBuilder } = require("discord.js");
const fs = require("node:fs");
const { Player } = require("discord-player");
const config = require("../config");
const { useMainPlayer } = require("discord-player");

module.exports = {
    name: "skip_song",
    async execute(interaction) {
        const player = useMainPlayer();
        const queue = player.nodes.get(interaction.guild.id);

        const embed = new EmbedBuilder();
        embed.setColor(config.embedColour);

        if (!queue || !queue.isPlaying()) {
            embed.setDescription("當前沒有播放音樂... 再試一次 ? ❌");
            //等待時間刪除消息
            setTimeout(() => {
                interaction.deleteReply();
            }, 5000);
            return await interaction.reply({
                embeds: [embed],
                ephemeral: true,
            });
        }

        queue.node.skip();

        let rawdata = fs.readFileSync("src/JSON/data.json");
        var data = JSON.parse(rawdata);

        data["songs-skipped"] += 1;

        embed.setDescription(`<@${interaction.user.id}>: 歌曲 **[${queue.currentTrack.title}](${queue.currentTrack.url})** 已跳過 ✅`);

        let newdata = JSON.stringify(data);
        fs.writeFileSync("src/JSON/data.json", newdata);
        //等待時間刪除消息
        setTimeout(() => {
            interaction.deleteReply();
        }, 5000);

        return await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
