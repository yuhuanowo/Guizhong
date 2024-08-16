const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const config = require("../../config");
const fs = require("fs");

//use openai api to generate text
const openai = require("openai");
const logger = require("../../utils/logger");
const { OpenAIApi } = require("openai");
const { OpenAI } = require("openai");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("chatgpt")
        .setDescription("Generate text using OpenAI's ChatGPT")
        .addStringOption((option) => option.setName("text").setDescription("Text to generate").setRequired(true)),

    async execute(interaction) {
        const prompt = interaction.options.getString("text");
        const axios = require("axios");
        const reply = new EmbedBuilder();
        reply.setTitle("正在生成中...");
        reply.setColor("#3399ff");
        await interaction.reply({ embeds: [reply] });

        // Define the base URL and API key
        const base_url = "http://localhost:25566/v1";
        const api_key = config.openaiapikey;

        // Define the data to be sent in the request body
        const requestData = {
            model: "local-model",
            messages: [
                { role: "system", content: "中文回答" },
                { role: "user", content: prompt },
            ],
            temperature: 0.7,
        };

        // Define the headers
        const headers = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${api_key}`,
        };

        // Make the HTTP request
        axios
            .post(`${base_url}/chat/completions`, requestData, { headers })
            .then((response) => {
                console.log(response.data.choices[0].message);
                const text = response.data.choices[0].message.content;
                //監測回傳ai使用 (內容 使用者)
                logger.info(`AI文本生成: ${text} \t 使用者: ${interaction.user.tag}`);

                //先傳送正在生成的訊息 之後再修改成生成完成的訊息
                const embed = new EmbedBuilder();
                embed.setTitle("AI Text Generation");
                embed.setDescription(text);
                embed.setTimestamp();
                embed.setFooter({ text: "Powered by OpenAI" });
                embed.setColor("#00ff00");
                interaction.editReply({ embeds: [embed] });
            })
            .catch((error) => {
                console.error("Error:", error);
            });
    },
};
