// unmute.js
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../db.js');

module.exports = {
    category: 'moderation',
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Снять мут с пользователя')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь')
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

        const target = interaction.options.getMember('user');
        const reason = interaction.options.getString('reason') || 'Без причины';

        if (!target) {
            return interaction.reply({ content: 'Пользователь не найден на сервере.', ephemeral: true });
        }

        if (target.user.bot) {
            return interaction.reply({ content: 'Нельзя снимать мут с ботов.', ephemeral: true });
        }

        try {
            // Снимаем таймаут в Discord
            await target.timeout(null);

            // Ищем последнюю запись мута (не снятую)

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('Мут снят')
                .addFields(
                    { name: 'Пользователь', value: `${target}`, inline: true },
                    { name: 'Модератор', value: `${interaction.user}`, inline: true },
                    { name: 'Причина снятия', value: reason }
                )
                .setTimestamp();

            try {
                await target.send({
                    embeds: [new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setTitle('Ваш мут снят')
                        .setDescription(`Сервер: **${interaction.guild.name}**\nПричина: ${reason}`)
                        .setTimestamp()]
                });
            } catch { }
        } catch (error) {
            console.error('Ошибка в /unmute:', error);
            await interaction.reply({ content: 'Ошибка при снятии мута.', ephemeral: true });
        }
    },
};