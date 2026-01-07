const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Остановить музыку и очистить очередь'),
    async execute(interaction) {
        await interaction.deferReply();
        const player = interaction.client.riffy.players.get(interaction.guild.id);
        if (!player) return interaction.followUp('Нет активного плеера!');

        player.queue.clear();
        player.destroy();  // Выход из канала

        await interaction.followUp({
            embeds: [new EmbedBuilder().setColor('#1db954').setDescription('Музыка остановлена, очередь очищена ⏹')]
        });
    }
};