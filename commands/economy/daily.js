const { SlashCommandBuilder } = require('discord.js');
const db = require('../../db.js');

module.exports = {
    category: 'economy',
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Получить ежедневный бонус'),
    async execute(interaction) {
        await interaction.deferReply();
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        const [rows] = await db.query('SELECT daily_last, balance, xp FROM users WHERE user_id = ? AND guild_id = ?', [userId, guildId]);
        if (rows.length === 0) {
            return interaction.editReply('У вас ещё нет профиля. Напишите сообщение, чтобы зарегистрироваться.');
        }

        const now = Date.now();
        const lastDaily = rows[0].daily_last || 0;
        const dayMs = 86400000; // 24 часа

        if (now - lastDaily < dayMs) {
            const remaining = Math.ceil((dayMs - (now - lastDaily)) / 3600000);
            return interaction.editReply(`Ежедневный бонус уже получен! Подождите ещё ${remaining} ч.`);
        }

        const moneyReward = 500;
        const xpReward = 100;

        await db.query('UPDATE users SET balance = balance + ?, xp = xp + ?, daily_last = ? WHERE user_id = ? AND guild_id = ?',
            [moneyReward, xpReward, now, userId, guildId]);

        await interaction.editReply(`🎉 Вы получили ежедневный бонус!\n+${moneyReward}$\n+${xpReward} XP`);
    },
};