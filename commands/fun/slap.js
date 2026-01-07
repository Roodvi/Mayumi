const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const slapGifs = [
    'https://media.tenor.com/3oN4zW6o3Z4AAAAC/slap-anime.gif',
    'https://media.tenor.com/5hLh5z1z1zIAAAAC/slap.gif',
    'https://media.tenor.com/1Z6qV4kBZQAAAAAC/slap.gif',
    'https://media.tenor.com/4Z4Y2nF.gif',
    'https://media.tenor.com/6Z6Z6Z6.gif',
    'https://media.tenor.com/7Z7Z7Z7.gif',
    'https://media.tenor.com/8Z8Z8Z8.gif',
    'https://media.tenor.com/9Z9Z9Z9.gif',
    'https://media.tenor.com/0A0A0A0.gif',
    'https://media.tenor.com/1B1B1B1.gif',
    'https://media.tenor.com/2C2C2C2.gif',
    'https://media.tenor.com/3D3D3D3.gif',
    'https://media.tenor.com/4E4E4E4.gif',
    'https://media.tenor.com/5F5F5F5.gif',
    'https://media.tenor.com/6G6G6G6.gif'
];

module.exports = {
    category: 'fun',
    data: new SlashCommandBuilder()
        .setName('slap')
        .setDescription('Шутливо шлёпнуть пользователя')
        .addUserOption(opt => opt
            .setName('user')
            .setDescription('Кого шлёпнуть')
            .setRequired(false)),
    async execute(interaction) {
        const target = interaction.options.getUser('user');
        const randomGif = slapGifs[Math.floor(Math.random() * slapGifs.length)];

        let description;
        if (!target) {
            description = `${interaction.user} шлёпнул воздух... Может, кого-то не хватает? 😏`;
        } else if (target.id === interaction.user.id) {
            description = `${interaction.user} шлёпнул себя... За что?! 😅`;
        } else if (target.bot) {
            description = `${interaction.user} хотел шлёпнуть бота ${target}, но боты не чувствуют боли... Не бей меня! 🤖🥺`;
            const embed = new EmbedBuilder()
                .setDescription(description)
                .setColor(0xFF69B4);
            return interaction.reply({ embeds: [embed] });
        } else {
            description = `${interaction.user} шутливо шлёпнул ${target}! 👋😆`;
        }

        const embed = new EmbedBuilder()
            .setDescription(description)
            .setImage(randomGif)
            .setColor(0xFF69B4);

        await interaction.reply({ embeds: [embed] });
    },
};