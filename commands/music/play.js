const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Воспроизвести трек или плейлист')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Название трека, YouTube/Spotify ссылка или поиск')
                .setRequired(true)),
    async execute(interaction) {
        const client = interaction.client;
        const manager = client.manager;

        if (!interaction.member.voice.channel) {
            return interaction.reply({ content: 'Зайдите в голосовой канал!', ephemeral: true });
        }

        await interaction.deferReply();

        let player = manager.players.get(interaction.guild.id);

        if (!player) {
            player = manager.createPlayer({
                guildId: interaction.guild.id,
                voiceChannelId: interaction.member.voice.channel.id,
                textChannelId: interaction.channel.id
            });
            player.connect();
        }

        const query = interaction.options.getString('query');

        const res = await manager.search(query);

        if (!res || res.loadType === 'LOAD_FAILED' || res.loadType === 'NO_MATCHES') {
            return interaction.editReply('Трек не найден или ошибка загрузки.');
        }

        if (res.loadType === 'PLAYLIST_LOADED') {
            player.queue.add(res.tracks);
            await interaction.editReply(`Добавлен плейлист: **${res.playlist.name}** (${res.tracks.length} треков)`);
        } else {
            const track = res.tracks[0];
            player.queue.add(track);
            await interaction.editReply(`Добавлен трек: **${track.title}** от ${track.author}`);
        }

        if (!player.playing && !player.paused) {
            player.play();
        }
    }
};