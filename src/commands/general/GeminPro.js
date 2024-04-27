const { GoogleGenerativeAI } = require("@google/generative-ai");
const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const config = require("../../config");
const fs = require("fs");
const genAI = new GoogleGenerativeAI(config.googleapikey);
const logger = require("../../utils/logger");
const generationConfig = {
    stopSequences: ["red"],
    maxOutputTokens: 2000,
    temperature: 0.9,
    topP: 0.1,
    topK: 16,
};
const model = genAI.getGenerativeModel({ model: "gemini-pro", generationConfig });

//use google-genmini ai for generating text

module.exports = {
    data: new SlashCommandBuilder()
        .setName("geminipro")
        .setDescription("Generate text using Google's gemini-pro AI")
        .addStringOption((option) => option.setName("text").setDescription("Text to generate").setRequired(true)),

    async execute(interaction) {
        const prompt = interaction.options.getString("text");
        const result = await model.generateContentStream(prompt);
        const reply = new EmbedBuilder();
        reply.setTitle("正在生成中...");
        reply.setColor("#3399ff");
        await interaction.reply({ embeds: [reply] });
        const response = await result.response;
        const text = response.text();
        //監測回傳ai使用 (內容 使用者)
        logger.info(`AI文本生成: ${text} \t 使用者: ${interaction.user.tag}`);

        //先傳送正在生成的訊息 之後再修改成生成完成的訊息
        const embed = new EmbedBuilder();
        embed.setTitle("AI Text Generation");
        embed.setDescription(text);
        embed.setTimestamp();
        embed.setFooter({ text: "Powered by Google Gemini Pro AI" });
        embed.setColor("#00ff00");
        await interaction.editReply({ embeds: [embed] });
    },
};
