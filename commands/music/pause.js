const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { getPlayer } = require("../../utils/music.js");

module.exports = {
  data: new SlashCommandBuilder().setName("pause").setDescription("Пауза"),
  async execute(interaction) {
    const player = getPlayer(interaction.client, interaction.guildId);
    if (!player) return interaction.reply({ content: "❌ Ничего не играет.", flags: MessageFlags.Ephemeral });
    player.pause(true);
    return interaction.reply("⏸️ Пауза.");
  },
};
