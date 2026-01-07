const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../db.js');

module.exports = {
    category: 'moderation',
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Выдать предупреждение пользователю')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Причина предупреждения')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({ content: 'Только модераторы могут использовать эту команду!', ephemeral: true });
        }

        const target = interaction.options.getMember('user');
        const reason = interaction.options.getString('reason');

        if (!target) {
            return interaction.reply({ content: 'Пользователь не найден на сервере.', ephemeral: true });
        }

        if (target.id === interaction.user.id) {
            return interaction.reply({ content: 'Нельзя выдать предупреждение себе!', ephemeral: true });
        }

        if (target.user.bot) {
            return interaction.reply({ content: 'Нельзя предупреждать ботов!', ephemeral: true });
        }

        if (target.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: 'Нельзя предупреждать администраторов!', ephemeral: true });
        }

        try {
            await db.query(
                'INSERT INTO infractions (guild_id, user_id, moderator_id, type, reason) VALUES (?, ?, ?, ?, ?)',
                [interaction.guild.id, target.id, interaction.user.id, 'warn', reason]
            );

            const embed = new EmbedBuilder()
                .setColor(0xFF9900)
                .setTitle('Предупреждение выдано')
                .addFields(
                    { name: 'Пользователь', value: `${target}`, inline: true },
                    { name: 'Модератор', value: `${interaction.user}`, inline: true },
                    { name: 'Причина', value: reason }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            try {
                await target.send({
                    embeds: [new EmbedBuilder()
                        .setColor(0xFF9900)
                        .setTitle('Вы получили предупреждение')
                        .setDescription(`Сервер: **${interaction.guild.name}**\nПричина: ${reason}`)
                        .setTimestamp()]
                });
            } catch { }
        } catch (error) {
            console.error('Ошибка в /warn:', error);
            await interaction.reply({ content: 'Ошибка при выдаче предупреждения.', ephemeral: true });
        }
    },
};