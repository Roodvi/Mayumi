const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const hugGifs = [
    'https://i.imgur.com/4Z4Y2nF.gif',
    'https://i.imgur.com/2lz8x.gif',
    'https://i.imgur.com/Vg7D0.gif',
    'https://i.imgur.com/4Z4Y2nF.gif',
    'https://i.imgur.com/4Z4Y2nF.gif',
    'https://i.imgur.com/4Z4Y2nF.gif'
];

module.exports = {
    category: 'fun',
    data: new SlashCommandBuilder()
        .setName('hug')
        .setDescription('Обнять пользователя')
        .addUserOption(opt => opt
            .setName('user')
            .setDescription('Кого обнять')
            .setRequired(false)),
    async execute(interaction) {
        const target = interaction.options.getUser('user');
        const randomGif = hugGifs[Math.floor(Math.random() * hugGifs.length)];

        let description;
        if (!target) {
            description = `${interaction.user} обнял всех вокруг! 🤗💕`;
        } else if (target.id === interaction.user.id) {
            description = `${interaction.user} обнял себя... Иногда это нужно! 🥺❤️`;
        } else if (target.bot) {
            description = `${interaction.user} хотел обнять бота ${target}, но боты не могут обниматься... Зато я ценю твою доброту! 🤖💕`;
            const embed = new EmbedBuilder()
                .setDescription(description)
                .setColor(0xFF69B4);
            return interaction.reply({ embeds: [embed] });
        } else {
            description = `${interaction.user} крепко обнял ${target}! 🤗❤️`;
        }

        const embed = new EmbedBuilder()
            .setDescription(description)
            .setImage(randomGif)
            .setColor(0xFF69B4);

        await interaction.reply({ embeds: [embed] });
    },
};