// const { EmbedBuilder, Colors } = require("discord.js");
// const config = require("../../config");
// const logger = require("../../utils/logger");

// module.exports = {
//     name: "voiceStateUpdate",
//     once: false,
//     async execute(oldState, newState) {
//         if (oldState.guild.id !== "606104244101185558") return; //for YuhuanStudio
//         //如果使用者加入語音頻道
//         if (!oldState.channel && newState.channel)
//         {
//             const channel = oldState.guild.channels.cache.get("764845795111338026");
//             const embed = new EmbedBuilder()
//                 .setTitle("🔊Voice State Update")
//                 .setDescription(`**${oldState.member.user}** 已加入 **${newState.channel.name}** 🎉`)
//                 .setAuthor({ name: oldState.member.user.tag, iconURL: oldState.member.user.displayAvatarURL() })
//                 .setColor(config.embedColour)
//                 .setTimestamp();
//             channel.send({ embeds: [embed] });
//         }

//         //if user leave voice channel
//         if (oldState.channel && !newState.channel)
//         {
//             const channel = oldState.guild.channels.cache.get("764845795111338026");
//             const embed = new EmbedBuilder()
//                 .setTitle("🔊Voice State Update")
//                 .setDescription(`**${oldState.member.user}** 已離開 **${oldState.channel.name}** 😢`)
//                 .setAuthor({ name: oldState.member.user.tag, iconURL: oldState.member.user.displayAvatarURL() })
//                 .setColor(config.embedColour)
//                 .setTimestamp();
//             channel.send({ embeds: [embed] });
//         }

//         //if user switch voice channel
//         if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id)
//         {
//             const channel = oldState.guild.channels.cache.get("764845795111338026");
//             const embed = new EmbedBuilder()
//                 .setTitle("🔊Voice State Update")
//                 .setDescription(`**${oldState.member.user}** 已從 **${oldState.channel.name}** 跑到 **${newState.channel.name}** 🔄`)
//                 .setAuthor({ name: oldState.member.user.tag, iconURL: oldState.member.user.displayAvatarURL() })
//                 .setColor(config.embedColour)
//                 .setTimestamp();
//             channel.send({ embeds: [embed] });
//         }

//     }

// };
