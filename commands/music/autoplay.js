const { SlashCommandBuilder, MessageFlags } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("autoplay")
    .setDescription("Автоподбор треков, когда очередь заканчивается")
    .addStringOption(o =>
      o.setName("mode")
        .setDescription("Включить или выключить")
        .setRequired(true)
        .addChoices(
          { name: "on", value: "on" },
          { name: "off", value: "off" },
        )
    ),

  async execute(interaction) {
    const mode = interaction.options.getString("mode", true);

    if (!interaction.client.autoplayGuilds) interaction.client.autoplayGuilds = new Map();

    if (mode === "on") {
      interaction.client.autoplayGuilds.set(interaction.guildId, true);
      return interaction.reply("✅ Autoplay включён.");
    } else {
      interaction.client.autoplayGuilds.set(interaction.guildId, false);
      return interaction.reply("🛑 Autoplay выключен.");
    }
  },
};
