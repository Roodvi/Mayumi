const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../db.js'); // Путь от файла команды к db.js

function getEmoji(category) {
    const emojis = {
        general: 'ℹ️',
        moderation: '🔨',
        economy: '💰',
        tops: '🏆',
        fun: '🎉',
    };
    return emojis[category] || '📌';
}

function getCategoryName(category) {
    const names = {
        general: 'Общее',
        moderation: 'Модерация',
        economy: 'Экономика',
        tops: 'Топы и профили',
        fun: 'Фан',
    };
    return names[category] || category.charAt(0).toUpperCase() + category.slice(1);
}

module.exports = {
    category: 'general',
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Показывает список всех команд бота с категориями'),

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

        const embed = new EmbedBuilder()
            .setColor(0x9B59B6)
            .setTitle('Меню команд')
            .setThumbnail(interaction.client.user.displayAvatarURL({ size: 256 }))
            .setDescription('Все команды — слэш (/).\n**Кликни на команду ниже — она вставится в чат!**')
            .setFooter({ text: `Запрос от ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        const categories = {};

        interaction.client.commands.forEach(cmd => {
            const cat = cmd.category || 'general';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(cmd);
        });

        const categoryOrder = ['general', 'moderation', 'economy', 'tops', 'fun'];

        categoryOrder.forEach(cat => {
            if (categories[cat]) {
                let fieldValue = '';
                categories[cat].forEach(cmd => {
                    const cmdId = interaction.client.commandIds.get(cmd.data.name);
                    const mention = cmdId ? `</${cmd.data.name}:${cmdId}>` : `/${cmd.data.name}`; // Кликабельно если ID есть

                    fieldValue += `**${mention}**\n${cmd.data.description || 'Нет описания'}\n\n`;
                });

                embed.addFields({
                    name: `${getEmoji(cat)} ${getCategoryName(cat)} (${categories[cat].length} команд)`,
                    value: fieldValue.trim(),
                    inline: false
                });
            }
        });

        // Другие категории
        Object.keys(categories).sort().forEach(cat => {
            if (!categoryOrder.includes(cat)) {
                let fieldValue = '';
                categories[cat].forEach(cmd => {
                    const cmdId = interaction.client.commandIds.get(cmd.data.name);
                    const mention = cmdId ? `</${cmd.data.name}:${cmdId}>` : `/${cmd.data.name}`;

                    fieldValue += `**${mention}**\n${cmd.data.description || 'Нет описания'}\n\n`;
                });

                embed.addFields({
                    name: `${getEmoji(cat)} ${getCategoryName(cat)} (${categories[cat].length} команд)`,
                    value: fieldValue.trim(),
                    inline: false
                });
            }
        });

        await interaction.editReply({ embeds: [embed], fetchReply: true, ephemeral: isEphemeral });
    },
};