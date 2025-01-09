const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const axios = require("axios");
const config = require("../../config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("taide")
        .setDescription("Generate text using TAIDE'S model")
        .addStringOption((option) => option.setName("text").setDescription("Text to generate").setRequired(true)),

    async execute(interaction) {
        const prompt = interaction.options.getString("text");
        const reply = new EmbedBuilder()
            .setTitle("正在生成中...")
            .setColor("#3399ff");
        await interaction.reply({ embeds: [reply] });

        try {
            const response = await connectToOllama(prompt);
            const embed = new EmbedBuilder()
                .setTitle("AI Text Generation")
                .setDescription(response)
                .setTimestamp()
                .setFooter({ text: "Powered by TAIDE's model, inferencing by YuhuanStudio" })
                .setColor("#00ff00");
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("Error generating text:", error);
            const errorEmbed = new EmbedBuilder()
                .setTitle("Error")
                .setDescription("There was an error generating the text. Please try again later.")
                .setColor("#ff0000");
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};

// Function to connect to Ollama server and talk with Llama 3.2 3B
async function connectToOllama(prompt) {
    const base_url = "http://localhost:11434/api/generate";
    const api_key = config.openaiapikey;

    const response = await axios.post(
        `${base_url}/generate`,
        {
            model: "llama3.2-3b",
            prompt: prompt,
            max_tokens: 100,
            temperature: 0.7,
        },
        {
            headers: {
                "Authorization": `Bearer ${api_key}`,
                "Content-Type": "application/json",
            },
        }
    );

    if (response.data && response.data.choices && response.data.choices.length > 0) {
        return response.data.choices[0].message.content;
    } else {
        throw new Error("No response from Ollama server");
    }
}