const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");
const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const config = require("../../config");
const fs = require("fs");
const logger = require("../../utils/logger");

const genAI = new GoogleGenerativeAI(config.googleapikey);

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("chat-gemini")
    .setDescription("Generate text using Google's gemini AI")
    .addStringOption((option) =>
      option
        .setName("model")
        .setDescription("選擇模型")
        .setRequired(true)
        .addChoices(
          { name: "gemini-2.0-flash-exp", value: "gemini-2.0-flash-exp" },
          { name: "gemini-1.5-flash", value: "gemini-1.5-flash" },
          { name: "gemini-1.5-pro", value: "gemini-1.5-pro" }
        )
    )
    .addStringOption((option) => option.setName("text").setDescription("輸入內容").setRequired(true)),

  async execute(interaction) {
    const selectedModel = interaction.options.getString("model");
    const prompt = interaction.options.getString("text");

    const model = genAI.getGenerativeModel({
      model: selectedModel,
    });

    const chatSession = model.startChat({
      generationConfig,
      history: [],
    });

    const reply = new EmbedBuilder().setTitle("正在生成中...").setColor("#3399ff");
    await interaction.reply({ embeds: [reply] });

    try {
      const result = await chatSession.sendMessage(prompt);
      const outputText = result.response.text();

      const embed = new EmbedBuilder()
        .setTitle("AI Text Generation")
        .setDescription(outputText)
        .setColor("#00ff00")
        .setFooter({ text: "Powered by Google Gemini Pro AI" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      logger.info(`AI文本生成: ${outputText} \t 使用者: ${interaction.user.tag}`);
    } catch (err) {
      console.error(err);
      const embed = new EmbedBuilder()
        .setTitle("AI Text Generation")
        .setDescription("生成失敗 - 請稍後再試")
        .setColor("#ff0000");
      await interaction.editReply({ embeds: [embed] });
    }
  },
};