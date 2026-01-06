const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const kissGifs = [
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
        .setName('kiss')
        .setDescription('Поцеловать пользователя')
        .addUserOption(opt => opt
            .setName('user')
            .setDescription('Кого поцеловать')
            .setRequired(false)),
    async execute(interaction) {
        const target = interaction.options.getUser('user');
        const randomGif = kissGifs[Math.floor(Math.random() * kissGifs.length)];

        let description;
        if (!target) {
            description = `${interaction.user} разослал воздушные поцелуи всем! 😘💕`;
        } else if (target.id === interaction.user.id) {
            description = `${interaction.user} поцеловал себя в зеркало... Ты прекрасен! 😏❤️`;
        } else if (target.bot) {
            description = `${interaction.user} хотел поцеловать бота ${target}, но боты не умеют целоваться... Спасибо за нежность! 🤖💕`;
            const embed = new EmbedBuilder()
                .setDescription(description)
                .setColor(0xFF69B4);
            return interaction.reply({ embeds: [embed] });
        } else {
            description = `${interaction.user} нежно поцеловал ${target}! 😘❤️`;
        }

        const embed = new EmbedBuilder()
            .setDescription(description)
            .setImage(randomGif)
            .setColor(0xFF69B4);

        await interaction.reply({ embeds: [embed] });
    },
};