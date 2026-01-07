const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    category: 'music',
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Пропустить текущий трек'),

    async execute(interaction) {
        const queue = interaction.client.player.nodes.get(interaction.guild);
        if (!queue || !queue.isPlaying()) {
            return interaction.reply('Ничего не играет!');
        }

        console.log('[LAVALINK] Пропуск трека');
        queue.node.skip();

        await interaction.reply('⏭ Трек пропущен!');
    },
};