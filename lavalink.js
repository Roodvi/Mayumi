const { Player } = require("discord-player");
const client = require("./index.js"); // или как у тебя клиент экспортируется

const player = new Player(client, {
  ytdlOptions: {
    quality: "highestaudio",
    highWaterMark: 1 << 25
  }
});

player.extractors.loadDefault(); // Поддержка YouTube, Spotify, SoundCloud и т.д.

// Подключение к твоей ноде Lavalink
player.nodes.create("local", {
  host: "localhost",
  port: 8080,
  password: "ТВОЙ_ПАРОЛЬ",
  secure: false
});

module.exports = player;