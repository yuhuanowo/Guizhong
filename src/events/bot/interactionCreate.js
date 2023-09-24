const { EmbedBuilder } = require("discord.js");
const logger = require("../../utils/logger");
const config = require("../../config");

module.exports = {
    name: "interactionCreate",
    once: false,
    async execute(interaction, client) {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.execute(interaction, client); 
            } catch (error) {
                logger.error("An error occurred whilst attempting to execute a chat input command:");//嘗試執行聊天輸入命令時發生錯誤
                logger.error(error);
            }
        } else if (interaction.isButton()) {
            if (interaction.customId.includes("-")) {
                const dashIndex = interaction.customId.indexOf("-");
                const button = client.buttons.get(interaction.customId.substring(0, dashIndex));
                if (!button) return;
                try {
                    await button.execute(interaction, client);
                } catch (error) {
                    logger.error("An error occurred whilst attempting to execute a button command:");//嘗試執行按鈕命令時發生錯誤
                    logger.error(error);
                }
            } else {
                const button = client.buttons.get(interaction.customId);
                if (!button) return;
                try {
                    await button.execute(interaction, client);
                } catch (error) {
                    logger.error("An error occurred whilst attempting to execute a button command:");//嘗試執行按鈕命令時發生錯誤
                    logger.error(error);
                }
            }
        } else if (interaction.isStringSelectMenu()) {
            const buttonOwner = interaction.customId.substring(interaction.customId.length - 18, interaction.customId.length);

            const embed = new EmbedBuilder();
            embed.setColor(config.embedColour);

            if (interaction.user.id != buttonOwner) {
                embed.setDescription(`Only <@${buttonOwner}> can use this menu.`);//只有<@${buttonOwner}>可以使用此選單。
                return await interaction.reply({
                    embeds: [embed],
                    ephemeral: true,
                });
            }

            if (interaction.values[0] == "help_category_general") {
                embed.setAuthor({ name: "Help" });
                embed.setTitle("General Commands");
                embed.setDescription("**/help** - Shows all  commands available.\n**/stats** - View some  bot statistics.\n**/botinfo** - View information .");
            } else if (interaction.values[0] == "help_category_music") {
                embed.setAuthor({ name: "Help" });
                embed.setTitle("Music Commands");
                embed.setDescription("**/play** - Adds a track to the end of the queue.\n**/playnext** - Adds a track to the next position in the queue.\n**/playshuffle** - Shuffles a playlist then adds all tracks to the end of the queue.\n**/pause** - Pauses the current music.\n**/resume** - Unpauses the current music.\n**/stop** - Stops the current music.\n**/skip** - Skips the current music.\n**/back** - Returns to the previous music.\n**/seek** - Seeks the current track to a specified position.\n**/nowplaying** - Shows information about the current track.\n**/queue** - Shows all tracks currently in the queue.\n**/clear** - Clears the queue.\n**/shuffle** - Shuffles all tracks currently in the queue.\n**/loop** - Changes the loop mode for the current music.\n**/volume** - Adjusts the volume of the current music.\n**/lyrics** - Search for the lyrics to a specified track.\n**/save** - Saves the current track information to your messages.");
            } else if (interaction.values[0] == "help_category_effects") {
                embed.setAuthor({ name: "Help" });
                embed.setTitle("Effect Commands");
                embed.setDescription("**/8d** - Applies the 8D filter to the currrent track.\n**/bassboost** - Applies the bass boost filter to the currrent track.\n**/chorus** - Applies the chorus filter to the currrent track.\n**/compressor** - Applies the compressor filter to the currrent track.\n**/expander** - Applies the expander filter to the currrent track.\n**/flanger** - Applies the flanger filter to the currrent track.\n**/nightcore** - Applies the nightcore filter to the currrent track.\n**/normalizer** - Applies the normalizer filter to the currrent track.\n**/phaser** - Applies the phaser filter to the currrent track.\n**/reverse** - Applies the reverse filter to the currrent track.\n**/surround** - Applies the surround filter to the currrent track.\n**/vaporwave** - Applies the vaporwave filter to the currrent track.");
            }

            return await interaction.update({ embeds: [embed] });
        } else if (interaction.isAutocomplete()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.autocompleteRun(interaction, client);
            } catch (error) {
                logger.error("An error occurred whilst attempting to run autocomplete:");//嘗試執行自動完成時發生錯誤
                logger.error(error);
            }
        }
    },
};
