const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const config = require("../../config");
const { useMainPlayer } = require("discord-player");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("lyrics")
        .setDescription("獲取當前播放歌曲的歌詞")
        .addStringOption((option) => option.setName("song").setDescription("要查找歌詞的歌曲名稱").setRequired(true)),
    async execute(interaction) {
        const player = useMainPlayer();
        const queue = player.nodes.get(interaction.guild.id);

        const embed = new EmbedBuilder();
        embed.setColor(config.embedColour);

        const song = interaction.options.getString("song");
        try {
            const res = await player.lyrics.search(song);
            embed.setAuthor({ name: `${res.title} - ${res.artist.name}`, url: res.url });
            embed.setDescription(res.lyrics.length > 4096 ? `[點擊這裡查看歌詞](${res.url})` : res.lyrics);
            embed.setFooter({ text: "Courtesy of Genius" });
        } catch (err) {
            console.error(err);
            embed.setDescription("找不到這首歌的任何歌詞❌");
        }

        return await interaction.reply({ embeds: [embed] });
    },
};