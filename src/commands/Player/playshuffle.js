const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { Player } = require("discord-player");
const fs = require("node:fs");
const logger = require("../../utils/logger");
const config = require("../../config");
const i18n = require("../../utils/i18n");
const { useMainPlayer } = require("discord-player");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("playshuffle")
        .setNameLocalizations({
            "zh-CN": "playshuffle",
            "zh-TW": "playshuffle"
        })
        .setDescription("Shuffle play a playlist")
        .setDescriptionLocalizations({
            "zh-CN": "循环播放歌曲清单",
            "zh-TW": "循環撥放歌曲清單"
        })
        .setDMPermission(false)
        .addStringOption((option) => 
            option.setName("playlist")
                .setDescription("Enter playlist URL.")
                .setDescriptionLocalizations({
                    "zh-CN": "输入播放清单URL.",
                    "zh-TW": "輸入撥放清單URL."
                })
                .setRequired(true)),
    async execute(interaction, client) {
        await interaction.deferReply();
        
        const guildId = interaction.guild.id;
        const language = i18n.getServerLanguage(guildId);

        const embed = new EmbedBuilder();
        embed.setColor(config.embedColour);

        const channel = interaction.member.voice.channel;

        if (!channel) {
            embed.setTitle(i18n.getString("commands.playshuffle.notInVoiceChannel", language));
            return await interaction.editReply({ embeds: [embed] });
        }

        if (interaction.guild.members.me.voice.channelId && interaction.member.voice.channelId !== interaction.guild.members.me.voice.channelId) {
            embed.setTitle(i18n.getString("commands.playshuffle.cantPlayInChannel", language));
            return await interaction.editReply({ embeds: [embed] });
        }

        const query = interaction.options.getString("playlist");

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

        const res = await player.search(query, {
            requestedBy: interaction.user,
        });

        if (!res) {
            embed.setTitle(i18n.getString("commands.playshuffle.playlistNotFound", language, { query: query }));
            await queue.delete();
            return await interaction.editReply({ embeds: [embed] });
        }

        if (!res.playlist) {
            embed.setTitle(i18n.getString("commands.playshuffle.notPlaylist", language));
            await queue.delete();
            return await interaction.editReply({ embeds: [embed] });
        }

        try {
            if (!queue.connection) await queue.connect(interaction.member.voice.channel);
        } catch (err) {
            if (queue) queue.delete();
            embed.setTitle(i18n.getString("commands.playshuffle.cantJoin", language));
            return await interaction.editReply({ embeds: [embed] });
        }

        try {
            queue.addTrack(res.tracks);
            await queue.tracks.shuffle();
            if (!queue.isPlaying()) await queue.node.play(queue.tracks[0]);
        } catch (err) {
            logger.error(i18n.getString("commands.playshuffle.error", language));
            logger.error(err);

            await queue.delete();

            embed.setTitle(i18n.getString("commands.playshuffle.mediaUnavailable", language));
            return await interaction.followUp({ embeds: [embed] });
        }

        const data = fs.readFileSync("src/JSON/data.json");
        const parsed = JSON.parse(data);

        parsed["queues-shuffled"] += 1;

        fs.writeFileSync("src/JSON/data.json", JSON.stringify(parsed));

        embed.setTitle(i18n.getString("commands.playshuffle.success", language, { 
            trackCount: res.tracks.length,
            playlistType: res.playlist.type,
            playlistTitle: res.playlist.title,
            playlistUrl: res.playlist.url
        }));

        return await interaction.editReply({ embeds: [embed] });
    },
};
