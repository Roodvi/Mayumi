const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const ms = require('ms');
const db = require('../../db.js');

module.exports = {
    category: 'moderation',
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Замутить пользователя на время')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('time')
                .setDescription('Время (примеры: 10m, 1h, 1d)')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Причина мута')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({ content: 'Только модераторы могут использовать эту команду!', ephemeral: true });
        }

        const target = interaction.options.getMember('user');
        const timeStr = interaction.options.getString('time');
        const reason = interaction.options.getString('reason');

        if (!target) {
            return interaction.reply({ content: 'Пользователь не найден на сервере.', ephemeral: true });
        }

        if (target.id === interaction.user.id) {
            return interaction.reply({ content: 'Нельзя замутить себя!', ephemeral: true });
        }

        if (target.user.bot) {
            return interaction.reply({ content: 'Нельзя мутить ботов!', ephemeral: true });
        }

        const durationMs = ms(timeStr);
        if (!durationMs || durationMs < 60000 || durationMs > 28 * 24 * 60 * 60 * 1000) {
            return interaction.reply({ content: 'Укажите корректное время (от 1 минуты до 28 дней). Примеры: 10m, 1h, 7d.', ephemeral: true });
        }

        if (!target.moderatable) {
            return interaction.reply({ content: 'Не могу замутить этого пользователя (роль выше моей или владелец сервера).', ephemeral: true });
        }

        try {
            await target.timeout(durationMs, reason);

            await db.query(
                'INSERT INTO infractions (guild_id, user_id, moderator_id, type, reason, duration_seconds) VALUES (?, ?, ?, ?, ?, ?)',
                [interaction.guild.id, target.id, interaction.user.id, 'mute', reason, Math.floor(durationMs / 1000)]
            );

            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('Пользователь замучен')
                .addFields(
                    { name: 'Пользователь', value: `${target}`, inline: true },
                    { name: 'Модератор', value: `${interaction.user}`, inline: true },
                    { name: 'Время', value: timeStr, inline: true },
                    { name: 'Причина', value: reason }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            try {
                await target.send({
                    embeds: [new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('Вы получили мут')
                        .setDescription(`Сервер: **${interaction.guild.name}**\nВремя: **${timeStr}**\nПричина: ${reason}`)
                        .setTimestamp()]
                });
            } catch { }
        } catch (error) {
            console.error('Ошибка в /mute:', error);
            await interaction.reply({ content: 'Ошибка при муте пользователя.', ephemeral: true });
        }
    },
};