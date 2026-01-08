const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Проиграть музыку по названию или ссылке")
    .addStringOption(option =>
      option
        .setName("query")
        .setDescription("Название или ссылка")
        .setRequired(true)
    ),

  async execute(interaction) {
    const query = interaction.options.getString("query", true);

    const voiceId = interaction.member?.voice?.channelId;
    if (!voiceId) {
      return interaction.reply({ content: "Зайди в голосовой канал.", ephemeral: true });
    }

    await interaction.deferReply();

    const riffy = interaction.client.riffy;

    // На новых версиях Riffy: createConnection()
    // На некоторых сборках может быть createPlayer()
    const player =
      riffy.players?.get(interaction.guildId) ??
      (typeof riffy.createConnection === "function"
        ? riffy.createConnection({
            guildId: interaction.guildId,
            voiceChannel: voiceId,
            textChannel: interaction.channelId,
            deaf: true,
          })
        : riffy.createPlayer(interaction.guildId, voiceId, interaction.channelId, true));

    const result = await riffy.resolve({
      query,
      requester: interaction.user,
    });

    if (!result?.tracks?.length) {
      return interaction.editReply("❌ Ничего не найдено");
    }

    const track = result.tracks[0];
    track.info.requester = interaction.user;

    player.queue.add(track);

    // Если это createPlayer()-ветка
    if (typeof player.connect === "function" && !player.connected) {
      await player.connect();
    }

    if (!player.playing && !player.paused) {
      await player.play();
    }

    return interaction.editReply(`🎶 Сейчас играет: **${track.info.title}**`);
  },
};
