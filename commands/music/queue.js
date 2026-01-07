const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    category: 'music',
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Показать текущую очередь'),

    async execute(interaction) {
        const queue = interaction.client.player.nodes.get(interaction.guild);
        if (!queue || queue.tracks.size === 0) {
            return interaction.reply('Очередь пуста!');
        }

        const tracks = queue.tracks.toArray().slice(0, 15);  // Топ-15
        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle('Очередь музыки')
            .setDescription(
                `Сейчас играет: **${queue.currentTrack.title}** (${queue.currentTrack.duration})\n\n` +
                tracks.map((t, i) => `${i + 1}. **${t.title}** (${t.duration}) — ${t.requestedBy?.tag || 'неизвестно'}`).join('\n')
            )
            .setFooter({ text: `Всего в очереди: ${queue.tracks.size} треков` });

        await interaction.reply({ embeds: [embed] });
    },
};