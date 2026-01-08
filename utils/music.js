const { MessageFlags } = require("discord.js");

function getVoiceId(interaction) {
  return interaction.member?.voice?.channelId || null;
}

function mustBeInVoice(interaction) {
  const voiceId = getVoiceId(interaction);
  if (!voiceId) {
    interaction.reply({
      content: "Зайди в голосовой канал.",
      flags: MessageFlags.Ephemeral,
    }).catch(() => {});
    return null;
  }
  return voiceId;
}

function getPlayer(client, guildId) {
  return client.riffy?.players?.get(guildId) || null;
}

function formatMs(ms) {
  const total = Math.max(0, Math.floor((ms || 0) / 1000));
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);
  const pad = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

module.exports = { mustBeInVoice, getPlayer, formatMs };
