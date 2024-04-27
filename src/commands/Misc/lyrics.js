const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { lyricsExtractor } = require("@discord-player/extractor");
const config = require("../../config");
const { Player } = require("discord-player");
const { tr } = require("date-fns/locale");

const lyricsClient = lyricsExtractor(config.geniusKey);

module.exports = {
    data: new SlashCommandBuilder()
        .setName("lyrics")
        .setDescription("獲取當前播放歌曲的歌詞")
        .addStringOption((option) => option.setName("song").setDescription("要查找歌詞的歌曲名稱").setRequired(true)),
    async execute(interaction) {
        const player = Player.singleton();
        const queue = player.nodes.get(interaction.guild.id);

        const embed = new EmbedBuilder();
        embed.setColor(config.embedColour);

        song = interaction.options.getString("song");
        await lyricsClient
            .search(song)
            .then((res) => {
                embed.setAuthor({ name: `${res.title} - ${res.artist.name}`, url: res.url });
                embed.setDescription(res.lyrics.length > 4096 ? `[點擊這裡查看歌詞](${res.url})` : res.lyrics);
                embed.setFooter({ text: "Courtesy of Genius" });
            })
            .catch((err) => {
                console.error(err);
                embed.setDescription("找不到這首歌的任何歌詞❌");
            });

        return await interaction.reply({ embeds: [embed] });
    },
};
