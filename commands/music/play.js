const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { controlsRow, volumeRow } = require("../../utils/musicControls.js");
const { format, bar } = require("../../utils/progress.js");

const pickString = (...vals) => vals.find(v => typeof v === "string" && v.length > 0) || null;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Проиграть музыку по названию или ссылке")
    .addStringOption(o =>
      o
        .setName("query")
        .setDescription("Название или ссылка")
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    try {
      const focused = interaction.options.getFocused(true);
      if (focused.name !== "query") return interaction.respond([]);

      const q = String(focused.value || "").trim();
      if (q.length < 2) return interaction.respond([]);

      const res = await interaction.client.riffy.resolve({
        query: `ytsearch:${q}`, // можно сменить на ytmsearch:
        requester: interaction.user,
      });

      const tracks = res?.tracks?.slice(0, 10) ?? [];
      const choices = tracks.map(t => {
        const title = String(t.info.title || "Unknown");
        const author =
          typeof t.info.author === "string" && t.info.author.length
            ? t.info.author
            : "Unknown";

        return {
          // что показывается в выпадающем списке
          name: `${title} — ${author}`.slice(0, 100),

          // что реально подставится в query
          value:
            typeof t.info.uri === "string" && t.info.uri.length
              ? t.info.uri
              : title.slice(0, 100),
        };
      });

      return interaction.respond(choices);
    } catch {
      return interaction.respond([]);
    }
  },

  async execute(interaction) {
    const query = interaction.options.getString("query", true);

    const voiceId = interaction.member?.voice?.channelId;
    if (!voiceId) {
      return interaction.reply({
        content: "Зайди в голосовой канал.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // "умная" логика: если бот уже в войсе — проверяем, что пользователь в том же канале
    const botVoiceId = interaction.guild?.members?.me?.voice?.channelId || null;
    const existing = interaction.client.riffy?.players?.get(interaction.guildId) || null;

    if (botVoiceId && botVoiceId !== voiceId) {
      return interaction.reply({
        content: "❌ Я уже в другом голосовом канале. Зайди ко мне или используй /stop.",
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply();

    // отменяем автолив, если он запланирован (см. index.js ниже)
    if (typeof interaction.client.cancelLeave === "function") {
      interaction.client.cancelLeave(interaction.guildId);
    }

    // если игрок уже есть — переиспользуем, иначе создаём соединение
    const player = existing || interaction.client.riffy.createConnection({
      guildId: interaction.guildId,
      voiceChannel: voiceId,
      textChannel: interaction.channelId,
      deaf: true,
    });

    // полезно обновлять textChannel, если команда вызвана в другом тексте
    try { player.textChannel = interaction.channelId; } catch { }

    const res = await interaction.client.riffy.resolve({
      query,
      requester: interaction.user,
    });

    if (!res?.tracks?.length) {
      return interaction.editReply("❌ Ничего не найдено.");
    }

    const track = res.tracks[0];
    track.info.requester = interaction.user;

    player.queue.add(track);

    // если уже играет — просто сообщили, что добавлено в очередь
    const ytThumb =
      typeof track.info.identifier === "string" && track.info.identifier.length
        ? `https://img.youtube.com/vi/${track.info.identifier}/hqdefault.jpg`
        : null;

    const thumbnail = pickString(track.info.artworkUrl, track.info.thumbnail, ytThumb);
    const author =
      typeof track.info.author === "string" && track.info.author.length
        ? track.info.author
        : "Unknown";

    const buildEmbed = () => {
      const cur = player.current || track; // ✅ главное изменение
      const info = cur.info || {};

      const title = String(info.title || "Unknown");
      const author =
        typeof info.author === "string" && info.author.length ? info.author : "Unknown";

      const ytThumb =
        typeof info.identifier === "string" && info.identifier.length
          ? `https://img.youtube.com/vi/${info.identifier}/hqdefault.jpg`
          : null;

      const thumbnail = pickString(info.artworkUrl, info.thumbnail, ytThumb);
      const wasPlaying = player.playing || player.paused;

      const embed = new EmbedBuilder()
        .setTitle(wasPlaying ? "🎶 Добавлено в очередь" : "🎶 Сейчас играет")
        .setDescription(`**Название:** ${title}\n**Автор:** ${author}`)
        .addFields({
          name: "Прогресс",
          value: `${format(player.position)} ${bar(player.position, info.length)} ${format(info.length)}`,
        })
        .setFooter({ text: `Запросил: ${interaction.user.tag}` });

      if (thumbnail) embed.setThumbnail(thumbnail);
      return embed;
    };

    if (!player.playing && !player.paused) {
      await player.play();
    }

    const message = await interaction.editReply({
      embeds: [buildEmbed()],
      components: [controlsRow(), volumeRow()],
    });

    if (!interaction.client.nowPlayingMessages) interaction.client.nowPlayingMessages = new Map();
    interaction.client.nowPlayingMessages.set(interaction.guildId, {
      channelId: interaction.channelId,
      messageId: message.id,
    });

    // авто-обновление embed (прогресс)
    if (!interaction.client.nowPlayingIntervals) interaction.client.nowPlayingIntervals = new Map();
    const old = interaction.client.nowPlayingIntervals.get(interaction.guildId);
    if (old) clearInterval(old);

    const interval = setInterval(async () => {
      try {
        const live = interaction.client.riffy?.players?.get(interaction.guildId);
        if (!live || !live.current) {
          clearInterval(interval);
          interaction.client.nowPlayingIntervals.delete(interaction.guildId);
          return;
        }
        await message.edit({
          embeds: [buildEmbed()],
          components: [controlsRow(), volumeRow()],
        });
      } catch {
        clearInterval(interval);
        interaction.client.nowPlayingIntervals.delete(interaction.guildId);
      }
    }, 5000);

    interaction.client.nowPlayingIntervals.set(interaction.guildId, interval);
  },
};
