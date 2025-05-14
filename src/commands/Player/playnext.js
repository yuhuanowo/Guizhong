const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { Player, useMainPlayer, QueryType } = require("discord-player");
const logger = require("../../utils/logger");
const config = require("../../config");
const i18n = require("../../utils/i18n");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("playnext")
        .setNameLocalizations({
            "zh-CN": "playnext",
            "zh-TW": "playnext"
        })
        .setDescription("Play a song next in the queue")
        .setDescriptionLocalizations({
            "zh-CN": "将歌曲添加到队列顶端",
            "zh-TW": "將歌曲添加到隊列頂端"
        })
        .setDMPermission(false)
        .addStringOption((option) => option.setName("query")
                .setDescription("Enter the track name, artist or URL.")
                .setDescriptionLocalizations({
                    "zh-CN": "输入曲目名称、作者名或 URL。",
                    "zh-TW": "輸入曲目名稱、作者名或 URL。"
                }).setRequired(true).setAutocomplete(config.autocomplete)),
    async execute(interaction, client) {
        await interaction.deferReply();
        
        const guildId = interaction.guild.id;
        const language = i18n.getServerLanguage(guildId);

        const embed = new EmbedBuilder();
        embed.setColor(config.embedColour);

        const channel = interaction.member.voice.channel;

        if (!channel) {
            embed.setTitle(i18n.getString("commands.play.notInVoiceChannel", language));
            return await interaction.editReply({ embeds: [embed] });
        }

        if (interaction.guild.members.me.voice.channelId && interaction.member.voice.channelId !== interaction.guild.members.me.voice.channelId) {
            embed.setTitle(i18n.getString("commands.play.cantPlayInChannel", language));
            return await interaction.editReply({ embeds: [embed] });
        }

        const query = interaction.options.getString("query");

        const player = useMainPlayer(client);
        let queue = player.nodes.get(interaction.guild.id);

        if (!queue) {
            player.nodes.create(interaction.guild.id, {
                leaveOnEmptyCooldown: config.leaveOnEmptyDelay,
                leaveOnEndCooldown: config.leaveOnEndDelay,
                leaveOnStopCooldown: config.leaveOnStopDelay,
                selfDeaf: config.deafenBot,
                metadata: {
                    channel: interaction.channel,
                    client: interaction.guild.members.me,
                    requestedBy: interaction.user,
                },
            });
        }

        queue = player.nodes.get(interaction.guild.id);

        try {
            const res = await player.search(query, {
                requestedBy: interaction.user,
            });

            if (!res || !res.tracks || res.tracks.length === 0) {
                if (queue) queue.delete();
                embed.setDescription(i18n.getString("commands.playnext.notFound", language, { query: query }));
                return await interaction.editReply({ embeds: [embed] });
            }

            if (res.playlist) {
                embed.setDescription(i18n.getString("commands.playnext.playlistNotSupported", language));
            } else {
                try {
                    if (!queue.connection) await queue.connect(interaction.member.voice.channel);
                } catch (err) {
                    if (queue) queue.delete();
                    embed.setDescription(i18n.getString("commands.playnext.cantJoin", language));
                    return await interaction.editReply({ embeds: [embed] });
                }

                try {
                    queue.insertTrack(res.tracks[0]);
                    if (!queue.isPlaying()) await queue.node.play(queue.tracks[0]);
                } catch (err) {
                    logger.error("Error occurred while trying to play this media:");
                    logger.error(err);

                    await queue.delete();

                    embed.setDescription(i18n.getString("commands.playnext.mediaUnavailable", language));
                    return await interaction.followUp({ embeds: [embed] });
                }

                embed.setDescription(i18n.getString("commands.playnext.addedToQueue", language, { title: `[${res.tracks[0].title}](${res.tracks[0].url}) by ${res.tracks[0].author}` }));
            }
        } catch (err) {
            logger.error(err);
            return interaction.editReply({ content: i18n.getString("commands.playnext.error", language) });
        }

        return await interaction.editReply({ embeds: [embed] });
    },
    async autocompleteRun(interaction) {
        const player = useMainPlayer();
        const query = interaction.options.getString("query", true);
        const resultsYouTube = await player.search(query, { searchEngine: QueryType.YOUTUBE });
        const resultsSpotify = await player.search(query, { searchEngine: QueryType.SPOTIFY_SEARCH });

        const tracksYouTube = resultsYouTube.tracks.slice(0, 5).map((t) => ({
            name: `YouTube: ${`${t.title} - ${t.author} (${t.duration})`.length > 75 ? `${`${t.title} - ${t.author}`.substring(0, 75)}... (${t.duration})` : `${t.title} - ${t.author} (${t.duration})`}`,
            value: t.url,
        }));

        const tracksSpotify = resultsSpotify.tracks.slice(0, 5).map((t) => ({
            name: `Spotify: ${`${t.title} - ${t.author} (${t.duration})`.length > 75 ? `${`${t.title} - ${t.author}`.substring(0, 75)}... (${t.duration})` : `${t.title} - ${t.author} (${t.duration})`}`,
            value: t.url,
        }));

        const tracks = [];

        tracksYouTube.forEach((t) => tracks.push({ name: t.name, value: t.value }));
        tracksSpotify.forEach((t) => tracks.push({ name: t.name, value: t.value }));

        return interaction.respond(tracks);
    },
};
