const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { Player, QueueRepeatMode } = require("discord-player");
const config = require("../../config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("loop")
        .setDescription("更改當前循環模式，或啟用自動播放.")
        .setDMPermission(false)
        .addStringOption((option) => option.setName("mode").setDescription("循環模式").setRequired(true).addChoices({ name: "off", value: "off" }, { name: "queue", value: "queue" }, { name: "track", value: "track" }, { name: "autoplay", value: "autoplay" })),
    async execute(interaction) {
        const player = Player.singleton();
        const queue = player.nodes.get(interaction.guild.id);
        const mode = interaction.options.getString("mode");

        const embed = new EmbedBuilder();
        embed.setColor(config.embedColour);

        if (!queue || !queue.isPlaying()) {
            embed.setTitle("當前沒有播放音樂... 再試一次 ? ❌.");
        } else {
            if (mode == "off") {
                queue.setRepeatMode(QueueRepeatMode.OFF);
                embed.setTitle("循環現已**禁用**✅");
            } else if (mode == "queue") {
                queue.setRepeatMode(QueueRepeatMode.QUEUE);
                embed.setTitle("**隊列**現在將無限重複✅");
            } else if (mode == "track") {
                queue.setRepeatMode(QueueRepeatMode.TRACK);
                embed.setTitle("**曲目**現在將無限重複✅");
            } else {
                queue.setRepeatMode(QueueRepeatMode.AUTOPLAY);
                embed.setTitle("隊列現在將**自動播放**✅");
            }
        }

        return await interaction.reply({ embeds: [embed] });
    },
};
