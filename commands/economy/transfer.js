const { SlashCommandBuilder } = require('discord.js');
const db = require('../../db.js');

module.exports = {
    category: 'economy',
    data: new SlashCommandBuilder()
        .setName('transfer')
        .setDescription('Перевести деньги другому пользователю')
        .addUserOption(opt => opt
            .setName('user')
            .setDescription('Кому перевести')
            .setRequired(true))
        .addIntegerOption(opt => opt
            .setName('amount')
            .setDescription('Сумма перевода')
            .setRequired(true)
            .setMinValue(1)),
    async execute(interaction) {
        await interaction.deferReply();
        const target = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');

        if (target.id === interaction.user.id) {
            return interaction.editReply('Нельзя переводить деньги себе!');
        }
        if (target.bot) {
            return interaction.editReply('Нельзя переводить деньги ботам!');
        }

        const guildId = interaction.guild.id;
        const senderId = interaction.user.id;

        const [senderRows] = await db.query('SELECT balance FROM users WHERE user_id = ? AND guild_id = ?', [senderId, guildId]);
        if (senderRows.length === 0 || senderRows[0].balance < amount) {
            return interaction.editReply(`Недостаточно денег! У вас ${senderRows[0]?.balance || 0}$`);
        }

        // Создаём профиль получателя, если его нет
        await db.query('INSERT IGNORE INTO users (user_id, guild_id, balance) VALUES (?, ?, 0)', [target.id, guildId]);

        await db.query('UPDATE users SET balance = balance - ? WHERE user_id = ? AND guild_id = ?', [amount, senderId, guildId]);
        await db.query('UPDATE users SET balance = balance + ? WHERE user_id = ? AND guild_id = ?', [amount, target.id, guildId]);

        await interaction.editReply(`✅ Вы перевели **${amount}$** пользователю ${target}`);
    },
};