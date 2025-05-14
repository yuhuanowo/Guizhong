const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const config = require("../../config");
const fs = require("fs");
const { useMainPlayer } = require("discord-player");
const i18n = require("../../utils/i18n");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("skip")
        .setNameLocalizations({
            "zh-CN": "skip",
            "zh-TW": "skip"
        })
        .setDescription("Skip the current song")
        .setDescriptionLocalizations({
            "zh-CN": "跳过当前歌曲",
            "zh-TW": "跳過當前歌曲"
        })
        .setDMPermission(false),
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

        // 保存当前曲目标题以在跳过后显示
        const currentTitle = queue.currentTrack.title;
        
        let rawdata = fs.readFileSync("src/JSON/data.json");
        var data = JSON.parse(rawdata);

        data["songs-skipped"] += 1;

        const success = queue.node.skip();

        if (success) {
            embed.setTitle(i18n.getString("commands.skip.success", language, {
                title: currentTitle
            }));
        } else {
            embed.setTitle(i18n.getString("commands.skip.error", language));
        }

        let newdata = JSON.stringify(data);
        fs.writeFileSync("src/JSON/data.json", newdata);

        return await interaction.reply({ embeds: [embed] });
    },
};
