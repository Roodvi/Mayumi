const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    category: 'music',
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Остановить музыку и выйти из канала'),

    async execute(interaction) {
        const queue = interaction.client.player.nodes.get(interaction.guild);
        if (!queue) {
            return interaction.reply('Бот не в голосовом канале!');
        }

        console.log('[LAVALINK] Остановка музыки и выход');
        queue.delete();  // Полностью удаляет очередь и отключается

        await interaction.reply('⏹ Музыка остановлена, бот вышел из канала.');
    },
};