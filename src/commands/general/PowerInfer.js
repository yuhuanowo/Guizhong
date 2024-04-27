const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const config = require("../../config");
const fs = require("fs");
const { Configuration, OpenAIApi } = require("openai");
const logger = require("../../utils/logger");
const axios = require("axios");
const { tr, da, te } = require("date-fns/locale");

//如果langchainhistory.json存在就讀取
const langchainhistory = JSON.parse(fs.readFileSync("./src/JSON/langchainhistory.json"));
console.log(langchainhistory);

module.exports = {
    data: new SlashCommandBuilder()
        .setName("power")
        .setDescription("Generate text using PowerInfer's Llama2-7B")
        .addStringOption((option) => option.setName("text").setDescription("Text to generate").setRequired(true)),

    async execute(interaction) {
        const prompt = interaction.options.getString("text");
        const reply = new EmbedBuilder();
        reply.setTitle("正在生成中...");
        reply.setColor("#3399ff");
        await interaction.reply({ embeds: [reply] });

        //從新讀取langchainhistory.json
        const langchainhistory = JSON.parse(fs.readFileSync("./src/JSON/langchainhistory.json"));
        console.log(langchainhistory);

        let data = JSON.stringify({
            prompt: prompt,
            n_predict: 128,
        });

        let config = {
            method: "post",
            maxBodyLength: Infinity,
            url: "http://127.0.0.1:8080/completion",
            headers: {
                "Content-Type": "application/json",
                accept: "application/json",
            },
            data: data,
        };

        axios
            .request(config)
            .then((response) => {
                const text = JSON.stringify(response.data);
                //只接收"text" 之後的內容 並刪除後面的message_id
                let text5 = text.replace(/."content":/g, "");
                let text6 = text5.replace(/,"generation_settings".*/g, "");
                //將回傳的json轉換成文字並刪除""
                let text1 = text6.replace(/"/g, "");
                //如果文本出現\n就刪除 並使用正確的換行
                let text2 = text1.replace(/\\n/g, "\n");
                console.log(text2);

                let langchainhistory = [
                    {
                        role: "user",
                        content: prompt,
                    },
                    {
                        role: "assistant",
                        content: text2,
                    },
                ];
                //save langchainhistory
                fs.writeFileSync("./src/JSON/langchainhistory.json", JSON.stringify(langchainhistory));
                console.log(langchainhistory);

                //回應生成完成
                const embed = new EmbedBuilder();
                embed.setTitle("AI Text Generation");
                embed.setDescription(text2);
                embed.setTimestamp();
                embed.setFooter({ text: "Powered by {model}".replace("{model}", "ChatGLM3-6B") });
                embed.setColor("#00ff00");
                interaction.editReply({ embeds: [embed] });
            })
            .catch((error) => {
                console.log(error);
                const embed = new EmbedBuilder();
                embed.setTitle("AI Text Generation");
                embed.setDescription("生成失敗");
                embed.setTimestamp();
                embed.setFooter({ text: "Powered by {model}".replace("{model}", "ChatGLM3-6B") });
                embed.setColor("#ff0000");
                interaction.editReply({ embeds: [embed] });
            });
    },
};
