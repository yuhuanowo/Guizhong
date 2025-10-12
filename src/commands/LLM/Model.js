const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const llmService = require("./utils/llmService");
const i18n = require("../../utils/i18n");
const { getModelEmoji, getEmojiUrl } = require("../../utils/modelEmojis");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("model")
    .setNameLocalizations({
      "zh-CN": "model",
      "zh-TW": "model"
    })
    .setDescription("View all available LLM models and their details")
    .setDescriptionLocalizations({
      "zh-CN": "查看所有可用的LLM模型及其详细信息",
      "zh-TW": "查看所有可用的LLM模型及其詳細資訊"
    }),

  async execute(interaction) {
    const guildId = interaction.guild?.id || interaction.guildId;
    const language = i18n.getServerLanguage(guildId);

    try {
      // 獲取所有模型（保持原本順序）
      const allModels = llmService.getAllAvailableModels();
      
      // 動態檢測所有可用的 provider
      const providersSet = new Set();
      allModels.forEach(model => {
        const providerType = llmService.getProviderType(model.value);
        providersSet.add(providerType);
      });
      
      // 將 Set 轉換為 Array 並排序
      const availableProviders = Array.from(providersSet).sort();
      
      // 按提供商分組（保持原順序）
      const modelsByProvider = {};
      availableProviders.forEach(provider => {
        modelsByProvider[provider] = [];
      });

      allModels.forEach(model => {
        const providerType = llmService.getProviderType(model.value);
        if (modelsByProvider[providerType]) {
          modelsByProvider[providerType].push(model);
        }
      });

      // 提供商名稱映射
      const providerNames = {
        github: "GitHub Models",
        gemini: "Google Gemini",
        ollama: "Ollama",
        groq: "Groq",
        openrouter: "OpenRouter",
        yunmo: "Yunmo",
        zhipu: "Zhipu AI"
      };

      // 當前選擇的提供商（默認為 "all"）
      let selectedProvider = "all";

      // 生成 Embed 函數
      const generateEmbeds = (provider, page = 0) => {
        const embeds = [];
        let modelsToShow = [];
        
        // 創建 Embed
        const embed = new EmbedBuilder()
          .setColor("#5865f2")
          .setTimestamp();

        if (provider === "all") {
          // 顯示所有提供商的統計信息
          embed.setTitle(i18n.getString("commands.model.title", language));
          
          let description = i18n.getString("commands.model.description", language, {
            total: allModels.length,
            providers: availableProviders.length
          });
          description += "\n\n";
          description += i18n.getString("commands.model.selectProviderHint", language);
          
          embed.setDescription(description);
          
          // 為每個提供商創建一個字段
          availableProviders.forEach(prov => {
            const emoji = getModelEmoji("", prov);
            const name = providerNames[prov] || prov;
            const count = modelsByProvider[prov].length;
            const models = modelsByProvider[prov];
            
            // 顯示前3個模型作為預覽
            let previewText = "";
            const previewCount = Math.min(3, models.length);
            for (let i = 0; i < previewCount; i++) {
              const modelEmoji = getModelEmoji(models[i].value, prov);
              previewText += `${modelEmoji} \`${models[i].value}\`\n`;
            }
            if (models.length > 3) {
              previewText += `_... ${i18n.getString("commands.model.andMore", language, { count: models.length - 3 })}_`;
            }
            
            embed.addFields({
              name: `${emoji} ${name} (${count} ${i18n.getString("commands.model.models", language)})`,
              value: previewText || "\u200b",
              inline: false
            });
          });
          
          embed.setFooter({ text: i18n.getString("commands.model.useSelectMenu", language) });
          
          return { embed, totalPages: 1 };
        } else {
          // 顯示特定提供商的詳細模型列表
          modelsToShow = modelsByProvider[provider] || [];
          
          const emoji = getModelEmoji("", provider);
          const providerName = providerNames[provider] || provider;
          embed.setTitle(`${emoji} ${providerName}`);
          
          let description = i18n.getString("commands.model.providerDescription", language, {
            provider: providerName,
            count: modelsToShow.length
          });
          embed.setDescription(description);
          
          // 每頁顯示 6 個模型（每行 2 個，共 3 行）
          const modelsPerPage = 6;
          const totalPages = Math.ceil(modelsToShow.length / modelsPerPage);
          const startIdx = page * modelsPerPage;
          const endIdx = Math.min(startIdx + modelsPerPage, modelsToShow.length);
          const pageModels = modelsToShow.slice(startIdx, endIdx);
          
          // 顯示模型列表
          if (pageModels.length > 0) {
            for (let idx = 0; idx < pageModels.length; idx++) {
              const model = pageModels[idx];
              const globalIdx = startIdx + idx + 1;
              const modelEmoji = getModelEmoji(model.value, provider);

              // 獲取使用限制
              const usageLimits = llmService.getModelUsageLimits();
              const limit = usageLimits[model.value];

              // 移除模型名稱中的 [Provider] 前綴（如果有 emoji 的話）
              let displayName = model.name;
              if (modelEmoji && modelEmoji !== "🤖") {
                // 移除 [OpenAI]、[GitHub] 等前綴
                displayName = displayName.replace(/^\[[\w\s]+\]\s*/, "");
              }

              let fieldValue = `**${i18n.getString("commands.model.identifier", language)}**: \`${model.value}\`\n`;
              if (limit) {
                fieldValue += `**${i18n.getString("commands.model.dailyLimit", language)}**: ${limit} ${i18n.getString("commands.model.timesPerDay", language)}`;
              }

              embed.addFields({
                name: `${globalIdx}. ${modelEmoji} ${displayName}`,
                value: fieldValue,
                inline: false
              });
            }
          } else {
            embed.addFields({
              name: i18n.getString("commands.model.noModels", language),
              value: "\u200b"
            });
          }
          
          // 添加頁碼信息
          if (totalPages > 1) {
            embed.setFooter({ 
              text: `${i18n.getString("commands.model.page", language)} ${page + 1}/${totalPages} • ${i18n.getString("commands.model.total", language)}: ${modelsToShow.length}` 
            });
          } else {
            embed.setFooter({ 
              text: `${i18n.getString("commands.model.total", language)}: ${modelsToShow.length}` 
            });
          }
          
          return { embed, totalPages };
        }
      };

      // 生成下拉選單
      const generateSelectMenu = (currentProvider, userId) => {
        const options = [
          {
            label: i18n.getString("commands.model.allProviders", language),
            value: "all",
            emoji: "📋",
            default: currentProvider === "all"
          }
        ];

        availableProviders.forEach(provider => {
          const rawEmoji = getModelEmoji("", provider);
          const name = providerNames[provider] || provider;
          
          // 處理 emoji：如果是自訂 Discord emoji，提取 ID 和名稱
          let emojiObj = "🔹"; // 默認 emoji
          if (rawEmoji && rawEmoji.startsWith("<")) {
            // 自訂 Discord emoji 格式: <:name:id> 或 <a:name:id>
            const match = rawEmoji.match(/<a?:(\w+):(\d+)>/);
            if (match) {
              emojiObj = {
                name: match[1],
                id: match[2]
              };
            }
          } else if (rawEmoji) {
            // 標準 Unicode emoji
            emojiObj = rawEmoji;
          }
          
          options.push({
            label: name,
            value: provider,
            emoji: emojiObj,
            description: `${modelsByProvider[provider].length} ${i18n.getString("commands.model.models", language)}`,
            default: currentProvider === provider
          });
        });

        return new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`model_provider_select_${userId}`)
            .setPlaceholder(i18n.getString("commands.model.selectProvider", language))
            .addOptions(options)
        );
      };

      // 生成按鈕
      const generateButtons = (page, totalPages, provider) => {
        // 如果是 "all" 視圖，不顯示翻頁按鈕
        if (provider === "all") {
          return null;
        }
        
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("model_first")
            .setEmoji("⏮️")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === 0 || totalPages <= 1),
          new ButtonBuilder()
            .setCustomId("model_prev")
            .setEmoji("◀️")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === 0 || totalPages <= 1),
          new ButtonBuilder()
            .setCustomId("model_page")
            .setLabel(totalPages > 1 ? `${page + 1}/${totalPages}` : "1/1")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId("model_next")
            .setEmoji("▶️")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page >= totalPages - 1 || totalPages <= 1),
          new ButtonBuilder()
            .setCustomId("model_last")
            .setEmoji("⏭️")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page >= totalPages - 1 || totalPages <= 1)
        );
      };

      // 初始顯示
      let currentPage = 0;
      const { embed, totalPages } = generateEmbeds(selectedProvider, currentPage);

      const components = [generateSelectMenu(selectedProvider, interaction.user.id)];
      const buttonRow = generateButtons(currentPage, totalPages, selectedProvider);
      if (buttonRow) {
        components.push(buttonRow);
      }

      const response = await interaction.reply({
        embeds: [embed],
        components: components
      });

      // 創建收集器
      const collector = response.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 300000 // 5分鐘
      });

      collector.on("collect", async i => {
        try {
          // 先 defer 更新以避免 interaction 超時
          await i.deferUpdate();
          
          // 處理下拉選單
          if (i.customId === `model_provider_select_${interaction.user.id}`) {
            selectedProvider = i.values[0];
            currentPage = 0; // 切換提供商時重置頁碼
          }
          // 處理按鈕
          else if (i.customId === "model_first") {
            currentPage = 0;
          } else if (i.customId === "model_prev") {
            currentPage = Math.max(0, currentPage - 1);
          } else if (i.customId === "model_next") {
            const { totalPages: pages } = generateEmbeds(selectedProvider, currentPage);
            currentPage = Math.min(pages - 1, currentPage + 1);
          } else if (i.customId === "model_last") {
            const { totalPages: pages } = generateEmbeds(selectedProvider, currentPage);
            currentPage = pages - 1;
          }

          // 更新顯示
          const { embed: newEmbed, totalPages: newTotalPages } = generateEmbeds(selectedProvider, currentPage);
          
          const newComponents = [generateSelectMenu(selectedProvider, interaction.user.id)];
          const newButtonRow = generateButtons(currentPage, newTotalPages, selectedProvider);
          if (newButtonRow) {
            newComponents.push(newButtonRow);
          }
          
          await i.editReply({
            embeds: [newEmbed],
            components: newComponents
          });
        } catch (error) {
          console.error("Error handling interaction:", error);
        }
      });

      collector.on("end", async () => {
        try {
          await interaction.editReply({
            components: []
          });
        } catch (error) {
          // 消息可能已被刪除
        }
      });

    } catch (error) {
      console.error("Model command error:", error);
      const errorEmbed = new EmbedBuilder()
        .setTitle(i18n.getString("commands.model.error", language))
        .setDescription(i18n.getString("commands.model.errorDescription", language, { error: error.message }))
        .setColor("#ff0000");

      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed], components: [] });
      } else {
        await interaction.reply({ embeds: [errorEmbed], flags: 64 }); // 64 = ephemeral
      }
    }
  }
};
