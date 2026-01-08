const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Пропустить трек'),
    async execute(interaction) {
        const client = interaction.client;
        const player = client.manager.players.get(interaction.guild.id);

        if (!player) return interaction.reply({ content: 'Ничего не играет!', ephemeral: true });
        if (!interaction.member.voice.channel || interaction.member.voice.channel.id !== player.voiceChannelId) {
            return interaction.reply({ content: 'Вы не в том же голосовом канале!', ephemeral: true });
        }

        if (player.queue.size === 0) {
            player.stop();
            return interaction.reply('Трек пропущен (очередь пуста, плеер остановлен)');
        }

        player.skip();
        await interaction.reply('Трек пропущен ⏭');
    }
};