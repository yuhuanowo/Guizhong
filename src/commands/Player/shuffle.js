const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const config = require("../../config");
const fs = require("fs");
const { useMainPlayer } = require("discord-player");
const i18n = require("../../utils/i18n");

module.exports = {
    data: new SlashCommandBuilder().setName("shuffle")
        .setNameLocalizations({
            "zh-CN": "shuffle",
            "zh-TW": "shuffle"
        }).setDescription("Shuffle the songs")
        .setDescriptionLocalizations({
            "zh-CN": "随机播放歌曲",
            "zh-TW": "隨機播放歌曲"
        }).setDMPermission(false),
    async execute(interaction) {
        const player = useMainPlayer();
        const queue = player.nodes.get(interaction.guild.id);
        const guildId = interaction.guild.id;
        const language = i18n.getServerLanguage(guildId);

        const embed = new EmbedBuilder();
        embed.setColor(config.embedColour);

        if (!queue || !queue.isPlaying()) {
            embed.setTitle(i18n.getString("common.notPlaying", language));
            return await interaction.reply({ embeds: [embed] });
        }

        if (!queue.tracks.toArray()[0]) {
            embed.setTitle(i18n.getString("commands.shuffle.notEnoughSongs", language));
            return await interaction.reply({ embeds: [embed] });
        }

        queue.tracks.shuffle();

        let rawdata = fs.readFileSync("src/JSON/data.json");
        var data = JSON.parse(rawdata);

        data["queues-shuffled"] += 1;

        let newdata = JSON.stringify(data);
        fs.writeFileSync("src/JSON/data.json", newdata);

        embed.setTitle(i18n.getString("commands.shuffle.success", language, { count: queue.tracks.toArray().length }));
        return await interaction.reply({ embeds: [embed] });
    },
};
