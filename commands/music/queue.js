const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Показать текущую очередь'),
    category: 'music',
    async execute(interaction) {
        const player = interaction.client.riffy.players.get(interaction.guild.id);

        if (!player || player.queue.length === 0) {
            return interaction.reply({ content: 'Очередь пуста!', ephemeral: true });
        }

        const queue = player.queue;
        const current = player.queue.current;  // Текущий трек

        let queueText = `**Сейчас играет:** ${current.title} (Запросил: <@${current.requester.id}>)\n\n**Очередь:**\n`;

        queue.forEach((track, index) => {
            queueText += `${index + 1}. **${track.title}** (Запросил: <@${track.requester.id}>)\n`;
        });

        // Обрезаем, если слишком длинно (лимит Discord ~2000 символов)
        if (queueText.length > 1900) {
            queueText = queueText.slice(0, 1900) + '...';
        }

        const embed = new EmbedBuilder()
            .setColor('#1db954')
            .setTitle('Очередь музыки')
            .setDescription(queueText || 'Очередь пуста')
            .setFooter({ text: `Всего треков: ${queue.length}` });

        await interaction.reply({ embeds: [embed] });
    }
};