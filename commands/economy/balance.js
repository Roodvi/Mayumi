const { SlashCommandBuilder } = require('discord.js');
const db = require('../../db.js'); // Путь от файла команды к db.js

module.exports = {
    category: 'economy',
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Показывает твой баланс')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь (по умолчанию ты)')
                .setRequired(false)),

    async execute(interaction) {
        const [prefRows] = await db.query(
            'SELECT prefer_ephemeral FROM mods WHERE user_id = ?',
            [interaction.user.id]
        );

        const preferEphemeral = prefRows.length > 0 ? prefRows[0].prefer_ephemeral : false; // По умолчанию скрытый

        // Опция для разового переопределения (опционально добавь в data)
        const optionEphemeral = interaction.options.getBoolean('ephemeral'); // null если нет опции
        const isEphemeral = optionEphemeral !== null ? optionEphemeral : preferEphemeral;

        await interaction.deferReply({ ephemeral: isEphemeral });

        const target = interaction.options.getUser('user') || interaction.user;

        // Запрещаем смотреть баланс у ботов
        if (target.bot) {
            return await interaction.editReply({ content: 'Боты не имеют баланса! 🤖', fetchReply: true, ephemeral: isEphemeral });
        }

        try {
            // Получаем баланс (только SELECT, без создания записи)
            const [rows] = await db.query(
                'SELECT balance FROM users WHERE user_id = ? AND guild_id = ?',
                [target.id, interaction.guild.id]
            );
            const [rows2] = await db.query(
                'SELECT * FROM guilds WHERE guild_id = ?',
                [interaction.guild.id]
            );

            let balance = 0;
            if (rows.length > 0) {
                balance = rows[0].balance;
            }
            // Если пользователя нет в БД — просто показываем 0 (без INSERT)

            await interaction.editReply({ content: `${target.username} имеет **${balance}**${rows2[0].emoji} на балансе!`, fetchReply: true, ephemeral: isEphemeral });
        } catch (error) {
            console.error('Ошибка БД в /balance:', error);
            await interaction.editReply({ content: 'Ошибка при чтении баланса. Попробуй позже.', fetchReply: true, ephemeral: true });
        }
    },
};