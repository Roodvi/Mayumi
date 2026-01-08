const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Остановить музыку и выйти из канала'),
    async execute(interaction) {
        const client = interaction.client;
        const player = client.manager.players.get(interaction.guild.id);

        if (!player) return interaction.reply({ content: 'Ничего не играет!', ephemeral: true });

        player.queue.clear();
        player.stop();
        player.disconnect();

        await interaction.reply('Музыка остановлена, бот вышел из канала ❌');
    }
};