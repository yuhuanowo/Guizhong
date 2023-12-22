const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const config = require('../../config');
const fs = require('fs');

//use openai api to generate text
const openai = require('openai-api');
const logger = require('../../utils/logger');
const openaiapi = new openai(config.openaiapikey);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ai')
        .setDescription('Generate text using OpenAI\'s API')
        .addStringOption(option => option.setName('text').setDescription('Text to generate').setRequired(true)),

      
      async execute(interaction) {
        const prompt  = interaction.options.getString('text');
        const result = await openaiapi.complete({
            engine: 'davinci',
            prompt: prompt,
            maxTokens: 100,
            temperature: 0.9,
            topP: 1,
            presencePenalty: 0,
            frequencyPenalty: 0,
            bestOf: 1,
            n: 1,
            stream: false,
            stop: ['\n']
          });
        const text = result.data.choices[0].text;
        //監測回傳ai使用 (內容 使用者)
        logger.info(`AI文本生成: ${text} \t 使用者: ${interaction.user.tag}`);

        //先傳送正在生成的訊息 之後再修改成生成完成的訊息
        const embed = new EmbedBuilder();
        embed.setTitle('AI Text Generation')
        embed.setDescription(text)
        embed.setTimestamp()
        embed.setFooter({ text: 'Powered by OpenAI'})
        embed.setColor('#00ff00');
        await interaction.reply({ embeds: [embed] });
    }
};