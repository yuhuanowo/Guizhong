const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./chatlog.db");
const { 
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require("discord.js");

module.exports = {
  name: "viewHistory",
  async execute(interaction) {
    if (interaction.isButton() && interaction.customId === "viewHistory") {
      // 查詢最近10筆紀錄
      db.all(
        "SELECT id, prompt, reply FROM chat_log WHERE user_id = ? ORDER BY timestamp DESC LIMIT 10",
        [interaction.user.id],
        async (err, rows) => {
          if (err || !rows.length) {
            const embed = new EmbedBuilder()
              .setDescription("沒有可用的歷史對話");
            return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
          }

          // 建立選單
          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId("historySelect")
            .setPlaceholder("選擇要查看的歷史對話")
            .addOptions(rows.map(r => ({
              label: r.prompt.substring(0, 50),
              value: r.id.toString()
            })));

          const row = new ActionRowBuilder().addComponents(selectMenu);

           
          const embed = new EmbedBuilder()
            .setTitle("歷史紀錄列表")
            .setDescription("請選擇要查看的紀錄")
            .setColor("#e8d8ff");

          await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
        }
      );
    }

    
  },
};