const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Показать очередь'),
    async execute(interaction) {
        const client = interaction.client;
        const player = client.manager.players.get(interaction.guild.id);

        if (!player || player.queue.size === 0) {
            return interaction.reply({ content: 'Очередь пуста!', ephemeral: true });
        }

        const queue = player.queue.tracks.slice(0, 10); // Первые 10 треков
        const embed = new EmbedBuilder()
            .setTitle('Очередь')
            .setDescription(queue.map((track, i) => `${i + 1}. **${track.title}** (${track.author})`).join('\n') || 'Пусто')
            .setFooter({ text: `Всего в очереди: ${player.queue.size}` });

        await interaction.reply({ embeds: [embed] });
    }
};