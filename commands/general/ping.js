const { SlashCommandBuilder } = require('discord.js');
const db = require('../../db.js'); // Путь от файла команды к db.js

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Проверяет задержку бота'),

    async execute(interaction) {
        const [prefRows] = await db.query(
            'SELECT prefer_ephemeral FROM mods WHERE user_id = ?',
            [interaction.user.id]
        );

        const preferEphemeral = prefRows.length > 0 ? prefRows[0].prefer_ephemeral : false; // По умолчанию скрытый

        // Опция для разового переопределения (опционально добавь в data)
        const optionEphemeral = interaction.options.getBoolean('ephemeral'); // null если нет опции
        const isEphemeral = optionEphemeral !== null ? optionEphemeral : preferEphemeral;
        // Вариант 1: Быстрый ответ без defer (подходит для ping, т.к. выполняется мгновенно)
        const sent = await interaction.reply({ content: 'Понг! Измеряю...', fetchReply: true, ephemeral: isEphemeral });

        const latency = sent.createdTimestamp - interaction.createdTimestamp;

        await interaction.editReply({
            content: `Понг!  Задержка: ${latency}мс | WebSocket: ${interaction.client.ws.ping}мс`
        });

        // Вариант 2: Если хочешь defer (на всякий случай, работает всегда)
        // await interaction.deferReply();
        // const sent = await interaction.editReply({ content: 'Понг! Измеряю...' });
        // const latency = sent.createdTimestamp - interaction.createdTimestamp;
        // await interaction.editReply(`Понг!  Задержка: ${latency}мс | WebSocket: ${interaction.client.ws.ping}мс`);
    },
};