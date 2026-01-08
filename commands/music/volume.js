const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { getPlayer } = require("../../utils/music.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("volume")
    .setDescription("Громкость")
    .addIntegerOption(o => o.setName("value").setDescription("1-200").setRequired(true)),
  async execute(interaction) {
    const v = interaction.options.getInteger("value", true);
    if (v < 1 || v > 200) return interaction.reply({ content: "Укажи 1-200.", flags: MessageFlags.Ephemeral });

    const player = getPlayer(interaction.client, interaction.guildId);
    if (!player) return interaction.reply({ content: "❌ Ничего не играет.", flags: MessageFlags.Ephemeral });

    player.setVolume(v);
    return interaction.reply(`🔊 Громкость: ${v}%`);
  },
};
