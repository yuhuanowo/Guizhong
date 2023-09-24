const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { lyricsExtractor } = require("@discord-player/extractor");
const config = require("../../config");

const lyricsClient = lyricsExtractor(config.geniusKey);

module.exports = {
    data: new SlashCommandBuilder()
        .setName("lyrics")
        .setDescription("查看指定歌曲的歌詞.")
        .addStringOption((option) => option.setName("query").setDescription("輸入曲目名稱、作者名或 URL.").setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();

        const embed = new EmbedBuilder();
        embed.setColor(config.embedColour);

        await lyricsClient
            .search(interaction.options.getString("query"))
            .then((res) => {
                embed.setAuthor({
                    name: `${res.title} - ${res.artist.name}`,
                    url: res.url,
                });
                embed.setTitle(res.lyrics.length > 4096 ? `[點擊這裡查看歌詞](${res.url})` : res.lyrics);
                embed.setFooter({ text: "Courtesy of Genius" });
            })
            .catch(() => {
                embed.setTitle(`我找不到帶有該名稱的曲目**${interaction.options.getString("query")}**.`);
            });

        return await interaction.editReply({
            embeds: [embed],
            ephemeral: true,
        });
    },
};
