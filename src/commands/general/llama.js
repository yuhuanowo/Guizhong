const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const config = require('../../config');
const fs = require('fs');
const { Configuration, OpenAIApi } = require('openai');
const logger = require('../../utils/logger');
const axios = require('axios');
const { tr } = require('date-fns/locale');


module.exports = {
    data: new SlashCommandBuilder()
        .setName('llama')
        .setDescription('Generate text using Llama 2 API')
        .addStringOption(option => option.setName('text').setDescription('Text to generate').setRequired(true)),

      
      async execute(interaction) {
        const prompt  = interaction.options.getString('text');
        const reply = new EmbedBuilder();
        reply.setTitle("正在生成中...")
        reply.setColor("#3399ff")
        await interaction.reply({ embeds: [reply] });

        let data = JSON.stringify({
            "model": "chatglm3-6b",
            "messages": [
              {
                "role": "user",
                "content": prompt
              }
            ],
            "temperature": 0.7,
            "n": 1,
            "max_tokens": 4096,
            "stop": [],
            "stream": true,
            "presence_penalty": 0,
            "frequency_penalty": 0
          });
          
          let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'http://127.0.0.1:7861/chat/fastchat',
            headers: { 
              'accept': 'application/json', 
              'Content-Type': 'application/json'
            },
            data : data
          };
          
          axios.request(config)
          .then((response) => {
            console.log(JSON.stringify(response.data));
            const text = JSON.stringify(response.data);
            //將回傳的json轉換成文字並刪除""
            let text1 = text.replace(/"/g, "");
            //如果文本出現\n就刪除 並使用正確的換行
            let text2 = text1.replace(/\\n/g, "\n");
            //回應生成完成
            const embed = new EmbedBuilder();
            embed.setTitle('AI Text Generation')
            embed.setDescription(text2)
            embed.setTimestamp()
            embed.setFooter({ text: 'Powered by {model}'.replace('{model}', 'ChatGLM3-6B')})
            embed.setColor('#00ff00');
            interaction.editReply({ embeds: [embed] });
          })
          .catch((error) => {
            console.log(error);
            const embed = new EmbedBuilder();
            embed.setTitle('AI Text Generation')
            embed.setDescription('生成失敗')
            embed.setTimestamp()    
            embed.setFooter({ text: 'Powered by {model}'.replace('{model}', 'ChatGLM3-6B')})
            embed.setColor('#ff0000');
            interaction.editReply({ embeds: [embed] });
          });
    }
};