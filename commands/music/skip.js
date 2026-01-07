const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Пропустить текущий трек'),
    category: 'music',  // Опционально, удали если не используешь категории
    async execute(interaction) {
        await interaction.deferReply();

        const player = interaction.client.riffy.players.get(interaction.guild.id);

        if (!player || !player.playing) {
            return interaction.followUp({ content: 'Сейчас ничего не играет!', ephemeral: true });
        }

        // Проверка, в голосовом ли канал пользователь
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel || voiceChannel.id !== player.voiceChannel) {
            return interaction.followUp({ content: 'Ты должен быть в том же голосовом канале!', ephemeral: true });
        }

        // Пропуск трека
        player.stop();  // В riffy это пропускает к следующему

        await interaction.followUp({
            embeds: [new EmbedBuilder()
                .setColor('#1db954')
                .setDescription('Трек пропущен ⏭')
            ]
        });
    }
};