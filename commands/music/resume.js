const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { getPlayer } = require("../../utils/music.js");

module.exports = {
  data: new SlashCommandBuilder().setName("resume").setDescription("Продолжить"),
  async execute(interaction) {
    const player = getPlayer(interaction.client, interaction.guildId);
    if (!player) return interaction.reply({ content: "❌ Ничего не играет.", flags: MessageFlags.Ephemeral });
    player.pause(false);
    return interaction.reply("▶️ Продолжаю.");
  },
};
