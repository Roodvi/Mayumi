// history.js (обновлённая версия — кнопка не появляется при пустой истории)
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../db.js');

module.exports = {
    category: 'moderation',
    data: new SlashCommandBuilder()
        .setName('history')
        .setDescription('Просмотреть историю наказаний пользователя (варны и муты)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь (по умолчанию — вы)')
                .setRequired(false)
        ),

    async execute(interaction) {
        let targetUser = interaction.options.getUser('user') ?? interaction.user;

        if (targetUser.bot) {
            return interaction.reply({ 
                content: 'Нельзя просматривать историю наказаний ботов!', 
                ephemeral: true 
            });
        }

        if (targetUser.id !== interaction.user.id && 
            !interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({ content: 'Вы можете просматривать только свою историю наказаний!', ephemeral: true });
        }

        try {
            const [rows] = await db.query(
                `SELECT u_id, type, moderator_id, reason, duration_seconds, timestamp, removed_by, removed_at, removed_reason 
                 FROM infractions 
                 WHERE guild_id = ? AND user_id = ? 
                 ORDER BY timestamp DESC 
                 LIMIT 15`,
                [interaction.guild.id, targetUser.id]
            );

            const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

            // Если история пустая — только эмбед без кнопки
            if (rows.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle(`История наказаний ${targetUser.tag}`)
                    .setDescription('Чистая история — нет записей о наказаниях.')
                    .setThumbnail(targetUser.displayAvatarURL());

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Если есть записи — показываем список + кнопку (активна только для админов)
            const warnCount = rows.filter(r => r.type === 'warn').length;
            const muteCount = rows.filter(r => r.type === 'mute').length;

            const embed = new EmbedBuilder()
                .setColor(0x992D22)
                .setTitle(`История наказаний ${targetUser.tag}`)
                .setDescription(`Всего записей: **${rows.length}** (предупреждений: ${warnCount}, мутов: ${muteCount})`)
                .setThumbnail(targetUser.displayAvatarURL());

            const list = rows.map((row, i) => {
                const mod = `<@${row.moderator_id}>`;
                const time = `<t:${Math.floor(new Date(row.timestamp).getTime() / 1000)}:R>`;
                let line = `**ID: ${row.u_id}** • ${i + 1}. **[${row.type.toUpperCase()}]** ${mod} — ${row.reason}\n└ ${time}`;

                if (row.type === 'mute' && row.duration_seconds) {
                    const durationMin = Math.round(row.duration_seconds / 60);
                    line += ` • Время: ${durationMin} мин`;
                }

                if (row.removed_at) {
                    const remover = row.removed_by ? `<@${row.removed_by}>` : 'Неизвестно';
                    const removeTime = `<t:${Math.floor(new Date(row.removed_at).getTime() / 1000)}:R>`;
                    line += `\n✅ **Снято** ${remover} ${removeTime}`;
                    if (row.removed_reason) line += ` • Причина снятия: ${row.removed_reason}`;
                }

                return line;
            }).join('\n\n');

            embed.addFields({ name: 'Последние наказания', value: list });

            if (rows.length === 15) {
                embed.setFooter({ text: 'Показано только 15 последних записей' });
            }

            // Кнопка появляется ТОЛЬКО если есть записи
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`clear_history_${targetUser.id}`)
                    .setLabel('Очистить историю')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(!isAdmin)
            );

            await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        } catch (error) {
            console.error('Ошибка в /history:', error);
            await interaction.reply({ content: 'Ошибка при загрузке истории.', ephemeral: true });
        }
    },
};