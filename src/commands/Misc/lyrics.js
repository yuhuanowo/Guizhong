const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const config = require("../../config");
const { useMainPlayer } = require("discord-player");
const i18n = require("../../utils/i18n");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("lyrics")
        .setNameLocalizations({
            "zh-CN": "lyrics",
            "zh-TW": "lyrics"
        })
        .setDescription("Get lyrics for a song")
        .setDescriptionLocalizations({
            "zh-CN": "获取歌曲的歌词",
            "zh-TW": "獲取當前播放歌曲的歌詞"
        })
        .addStringOption((option) => 
            option.setName("song")
                .setDescription("The song to find lyrics for")
                .setDescriptionLocalizations({
                    "zh-CN": "要查找歌词的歌曲名称",
                    "zh-TW": "要查找歌詞的歌曲名稱"
                })
                .setRequired(true)
        ),
    async execute(interaction) {
        const player = useMainPlayer();
        const queue = player.nodes.get(interaction.guild.id);
        
        const guildId = interaction.guild.id;
        const language = i18n.getServerLanguage(guildId);

        const embed = new EmbedBuilder();
        embed.setColor(config.embedColour);

        const song = interaction.options.getString("song");
        try {
            // 使用新的 Discord Player v7 歌词API
            const searchResult = await player.search(song);
            if (!searchResult || !searchResult.tracks[0]) {
                throw new Error("No search results found");
            }
            
            // 获取第一首歌曲的歌词
            const firstTrack = searchResult.tracks[0];
            const trackWithLyrics = await firstTrack.fetchLyrics();
            
            embed.setAuthor({ 
                name: `${firstTrack.title} - ${firstTrack.author}`, 
                url: firstTrack.url 
            });
            
            if (trackWithLyrics) {
                embed.setDescription(trackWithLyrics.length > 4096 ? `${trackWithLyrics.slice(0, 4090)}...` : trackWithLyrics);
            } else {
                // 获取本地化的链接文本
                const clickHereText = i18n.getString("commands.lyrics.clickHereText", language);
                embed.setDescription(i18n.getString("commands.lyrics.notFound", language) + 
                    `\n[${clickHereText}](https://www.google.com/search?q=${encodeURIComponent(`${firstTrack.title} ${firstTrack.author} lyrics`)})`);
            }
        } catch (err) {
            console.error(err);
            embed.setDescription(i18n.getString("commands.lyrics.error", language));
        }

        return await interaction.reply({ embeds: [embed] });
    },
};
