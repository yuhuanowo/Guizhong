const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
const config = require("../../config");

module.exports = {
    data: new SlashCommandBuilder().setName("help").setDescription("Shows all Melody commands available."),
    async execute(interaction) {
        const embed = new EmbedBuilder();
        embed.setTitle("歸終");
        embed.setDescription("要查看所有可用命令，請從下面的選擇菜單中選擇一個類別。");
        embed.setColor(config.embedColour);

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId(`help_category_select_${interaction.user.id}`).setPlaceholder("選擇類別以查看命令.").addOptions(
                {
                    label: "General",
                    description: "與音樂無關的命令.",
                    value: "help_category_general",
                },
                {
                    label: "Music Controls",
                    description: "用於音樂的命令.",
                    value: "help_category_music",
                },
                {
                    label: "Effects",
                    description: "控制當前音樂效果的命令.",
                    value: "help_category_effects",
                }
            )
        );

        return await interaction.reply({ embeds: [embed], components: [row] });
    },
};
