const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const config = require("../../config");
const fs = require("fs");
const { Configuration, OpenAIApi } = require("openai");
const logger = require("../../utils/logger");
const axios = require("axios");
const { tr } = require("date-fns/locale");
const qs = require("qs");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("image")
        .setDescription("Generate image using Stable Diffusion")
        .addStringOption((option) => option.setName("prompt").setDescription("prompt").setRequired(true))
        .addStringOption((option) => option.setName("negative_prompt").setDescription("negative_prompt").setRequired(false))
        .addStringOption((option) => option.setName("seed").setDescription("seed").setRequired(false)),

    async execute(interaction) {
        const prompt = interaction.options.getString("prompt");
        const negative_prompt = interaction.options.getString("negative_prompt");
        const seed = interaction.options.getString("seed");
        const reply = new EmbedBuilder();
        reply.setTitle("正在生成中...");
        reply.setColor("#3399ff");
        await interaction.reply({ embeds: [reply] });

        let data = qs.stringify({
            prompt: prompt,
            negative_prompt: negative_prompt,
            seed: seed,
        });

        let config = {
            method: "post",
            maxBodyLength: Infinity,
            url: "http://192.168.50.220:5000/stable",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data: data,
        };

        axios
            .request(config)
            .then((response) => {
                imagename = response.data;
                //wait 1 second to wait for the image to be generated
                Image_url = "http://yuhuantw.synology.me:5000/static/stable_" + imagename + ".png";
                //回應生成完成
                const embed = new EmbedBuilder();
                embed.setTitle("AI Image Generation");
                embed.setTimestamp();
                embed.setImage(Image_url);
                embed.setFooter({ text: "Powered by {model}".replace("{model}", "SDXL Turbo") });
                embed.setColor("#00ff00");
                interaction.editReply({ embeds: [embed] });
                //send image
                //interaction.channel.send({ files: [Image_url] });
            })
            .catch((error) => {
                console.log(error);
                const embed = new EmbedBuilder();
                embed.setTitle("AI Image Generation");
                embed.setDescription("生成失敗");
                embed.setTimestamp();
                embed.setFooter({ text: "Powered by {model}".replace("{model}", "SDXL Turbo") });
                embed.setColor("#ff0000");
                interaction.editReply({ embeds: [embed] });
            });
    },
};
