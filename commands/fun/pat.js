const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const patGifs = [
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
        .setName('pat')
        .setDescription('Погладить пользователя по голове')
        .addUserOption(opt => opt
            .setName('user')
            .setDescription('Кого погладить')
            .setRequired(false)),
    async execute(interaction) {
        const target = interaction.options.getUser('user');
        const randomGif = patGifs[Math.floor(Math.random() * patGifs.length)];

        let description;
        if (!target) {
            description = `${interaction.user} гладит всех по голове! Хорошие все! 🥰💕`;
        } else if (target.id === interaction.user.id) {
            description = `${interaction.user} погладил себя по голове... Ты молодец! 😌❤️`;
        } else if (target.bot) {
            description = `${interaction.user} хотел погладить бота ${target}, но боты не чувствуют поглаживаний... Но я всё равно счастлив! 🤖💕`;
            const embed = new EmbedBuilder()
                .setDescription(description)
                .setColor(0xFF69B4);
            return interaction.reply({ embeds: [embed] });
        } else {
            description = `${interaction.user} нежно погладил ${target} по голове! 🥰❤️`;
        }

        const embed = new EmbedBuilder()
            .setDescription(description)
            .setImage(randomGif)
            .setColor(0xFF69B4);

        await interaction.reply({ embeds: [embed] });
    },
};