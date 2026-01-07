// unwarn.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../db.js');

module.exports = {
    category: 'moderation',
    data: new SlashCommandBuilder()
        .setName('unwarn')
        .setDescription('Снять предупреждение по ID')
        .addIntegerOption(option =>
            option.setName('id')
                .setDescription('ID предупреждения (из /history)')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Причина снятия (необязательно)')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({ content: 'Только модераторы!', ephemeral: true });
        }

        const infractionId = interaction.options.getInteger('id');
        const reason = interaction.options.getString('reason') || 'Без причины';

        try {
            const [rows] = await db.query(
                'SELECT user_id, type FROM infractions WHERE u_id = ? AND guild_id = ?',
                [infractionId, interaction.guild.id]
            );

            if (rows.length === 0) {
                return interaction.reply({ content: 'Наказание с таким ID не найдено.', ephemeral: true });
            }

            const infraction = rows[0];
            if (infraction.type !== 'warn') {
                return interaction.reply({ content: 'Этот ID принадлежит муту, а не предупреждению. Используйте /unmute.', ephemeral: true });
            }

            if (rows[0].removed_at) { // уже снято
                return interaction.reply({ content: 'Это предупреждение уже снято.', ephemeral: true });
            }

            await db.query(
                'UPDATE infractions SET removed_by = ?, removed_at = NOW(), removed_reason = ? WHERE u_id = ?',
                [interaction.user.id, reason, infractionId]
            );

            const target = await interaction.guild.members.fetch(infraction.user_id).catch(() => null);

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('Предупреждение снято')
                .addFields(
                    { name: 'ID', value: `${infractionId}`, inline: true },
                    { name: 'Пользователь', value: target ? `${target}` : `<@${infraction.user_id}>`, inline: true },
                    { name: 'Модератор', value: `${interaction.user}`, inline: true },
                    { name: 'Причина снятия', value: reason }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            // Уведомление в ЛС
            if (target) {
                try {
                    await target.send({
                        embeds: [new EmbedBuilder()
                            .setColor(0x00FF00)
                            .setTitle('Ваше предупреждение снято')
                            .setDescription(`Сервер: **${interaction.guild.name}**\nID: ${infractionId}\nПричина снятия: ${reason}`)
                            .setTimestamp()]
                    });
                } catch { }
            }
        } catch (error) {
            console.error('Ошибка в /unwarn:', error);
            await interaction.reply({ content: 'Ошибка при снятии предупреждения.', ephemeral: true });
        }
    },
};