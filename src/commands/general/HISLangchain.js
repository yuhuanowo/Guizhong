const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
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
        .setName("對話2test")
        .setDescription("Generate text using Langchain's ChatGLM3-6B")
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
            query: prompt,
            conversation_id: "None",
            history_len: -1,
            history: [
                {
                    role: "user",
                    content: langchainhistory[0].content,
                },
                {
                    role: "assistant",
                    content: langchainhistory[1].content,
                },
            ],
            stream: false,
            model_name: "chatglm3-6b",
            temperature: 0.7,
            max_tokens: 2048,
            prompt_name: "default",
        });

        let config = {
            method: "post",
            maxBodyLength: Infinity,
            url: "http://127.0.0.1:7861/chat/chat",
            headers: {
                accept: "application/json",
                "Content-Type": "application/json",
            },
            data: data,
        };

        axios
            .request(config)
            .then((response) => {
                const text = JSON.stringify(response.data);
                //只接收"text" 之後的內容 並刪除後面的message_id
                let text5 = text.replace(/."text":/g, "");
                let text6 = text5.replace(/,"message_id".*/g, "");
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
