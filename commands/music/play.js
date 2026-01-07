const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    category: 'music',
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Воспроизвести трек или плейлист')
        .addStringOption(option =>
            option
                .setName('query')
                .setDescription('Ссылка или название трека')
                .setRequired(true)
        ),

    async execute(interaction) {
        console.log(`[LAVALINK] /play от ${interaction.user.tag}: ${interaction.options.getString('query')}`);

        await interaction.deferReply();

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) return interaction.editReply('Зайди в голосовой канал!');

        try {
            let query = interaction.options.getString('query').trim();

            // Автоматически добавляем префикс ytsearch: для названий (не ссылок)
            const isUrl = query.startsWith('http://') || query.startsWith('https://') || query.includes('://');
            if (!isUrl) {
                query = `ytsearch:${query}`;
                console.log(`[LAVALINK] Добавлен префикс ytsearch: для названия трека`);
            }

            console.log('[LAVALINK] Поиск через Lavalink:', query);
            const searchResult = await interaction.client.player.search(query, {
                requestedBy: interaction.user
            });

            if (!searchResult.hasTracks()) {
                console.log('[LAVALINK] Ничего не найдено по запросу');
                return interaction.editReply('Ничего не найдено 😔 Попробуй прямую YouTube-ссылку или точное название.');
            }

            console.log(`[LAVALINK] Найдено ${searchResult.tracks.length} треков (плейлист: ${searchResult.playlist ? 'да' : 'нет'})`);

            const queue = interaction.client.player.nodes.create(interaction.guild, {
                metadata: { channel: interaction.channel },
                volume: 80,
                selfDeaf: true,
                leaveOnEnd: true,
                leaveOnEmpty: true
            });

            if (!queue.connection) {
                console.log('[LAVALINK] Подключение к каналу...');
                await queue.connect(voiceChannel);
                console.log('[LAVALINK] Подключено');
            }

            queue.addTrack(searchResult.tracks);
            console.log('[LAVALINK] Треки добавлены в очередь');

            if (!queue.isPlaying()) {
                console.log('[LAVALINK] Запуск воспроизведения...');
                await queue.node.play();
                console.log('[LAVALINK] Воспроизведение стартовано!');
            }

            const replyText = searchResult.playlist
                ? `🎶 Добавлен плейлист: **${searchResult.tracks.length}** треков!`
                : `🎶 Добавлен трек: **${searchResult.tracks[0].title}** (${searchResult.tracks[0].duration})`;

            await interaction.editReply(replyText);
        } catch (error) {
            console.error('[LAVALINK] Ошибка в /play:', error);
            await interaction.editReply('Не удалось воспроизвести трек 😔');
        }
    },
};