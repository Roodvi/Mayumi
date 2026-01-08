const player = require("./lavalink.js");

// Примеры событий (добавь в index.js или events/)
player.on("trackStart", (queue, track) => {
  queue.metadata.channel.send(`🎵 Играет: **${track.title}**`);
});

player.on("queueEnd", (queue) => {
  queue.metadata.channel.send("🎶 Очередь закончилась!");
});

player.on("error", (queue, error) => {
  console.error(error);
  queue.metadata.channel.send("❌ Ошибка воспроизведения!");
});

module.exports = player;