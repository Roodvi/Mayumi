const { SlashCommandBuilder } = require('discord.js');
const db = require('../../db.js');

module.exports = {
    category: 'settings',
    data: new SlashCommandBuilder()
        .setName('privacy')
        .setDescription('Настройка видимости ответов бота (скрытые/публичные по умолчанию)')
        .addBooleanOption(option =>
            option.setName('ephemeral')
                .setDescription('Скрытые ответы по умолчанию? (true — скрытые, false — публичные)')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true }); // Команда всегда скрытая

        const ephemeral = interaction.options.getBoolean('ephemeral');

        try {
            const [rows] = await db.query(
                'SELECT * FROM mods WHERE user_id = ?',
                [interaction.user.id]
            );

            if (rows.length === 0) {
                await db.query(
                    'INSERT INTO mods (user_id, prefer_ephemeral) VALUES (?, ?)',
                    [interaction.user.id, ephemeral]
                );
            } else {
                await db.query(
                    'UPDATE mods SET prefer_ephemeral = ? WHERE user_id = ?',
                    [ephemeral, interaction.user.id]
                );
            }

            const status = ephemeral ? 'скрытый (ephemeral)' : 'публичный';
            await interaction.editReply(`Видимость ответов бота по умолчанию: **${status}**!`);
        } catch (error) {
            console.error('Ошибка в /privacy:', error);
            await interaction.editReply('Ошибка при сохранении настройки.');
        }
    },
};