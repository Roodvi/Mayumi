const { SlashCommandBuilder } = require('discord.js');
const db = require('../../db.js');

module.exports = {
    category: 'admin',
    data: new SlashCommandBuilder()
        .setName('setlevelrole')
        .setDescription('Настроить роль за уровень (админы)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Установить роль для уровня')
                .addIntegerOption(option =>
                    option
                        .setName('level')
                        .setDescription('Уровень (1+)')
                        .setRequired(true)
                        .setMinValue(1)
                )
                .addRoleOption(option =>
                    option
                        .setName('role')
                        .setDescription('Роль для выдачи')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Удалить роль для уровня')
                .addIntegerOption(option =>
                    option
                        .setName('level')
                        .setDescription('Уровень (1+)')
                        .setRequired(true)
                        .setMinValue(1)
                )
        ),

    async execute(interaction) {
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: 'Только админы!', ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (subcommand === 'set') {
            const level = interaction.options.getInteger('level');
            const role = interaction.options.getRole('role');

            const botMember = interaction.guild.members.me;
            if (!botMember.permissions.has('ManageRoles')) {
                return interaction.reply('Бот не имеет права Manage Roles для выдачи ролей!');
            }

            if (role.position >= botMember.roles.highest.position) {
                return interaction.reply('Эта роль выше роли бота в иерархии — бот не сможет её выдать!');
            }

            try {
                // Проверка: не назначена ли эта роль уже на ДРУГОЙ уровень
                const [existingRole] = await db.query(
                    'SELECT level FROM guilds WHERE guild_id = ? AND role_id = ? AND level != ?',
                    [guildId, role.id, level]
                );

                if (existingRole.length > 0) {
                    const usedLevel = existingRole[0].level;
                    return interaction.reply(`Эта роль уже назначена на уровень **${usedLevel}**! Одна роль — только один уровень.`);
                }

                // Проверка текущей роли на этом уровне (для красивого сообщения)
                const [current] = await db.query(
                    'SELECT role_id FROM guilds WHERE guild_id = ? AND level = ?',
                    [guildId, level]
                );

                const currentRoleId = current.length > 0 ? current[0].role_id : null;

                if (currentRoleId === role.id) {
                    return interaction.reply(`Роль ${role.name} уже установлена для уровня ${level}!`);
                }

                // Upsert: обновляем или вставляем
                const [updateResult] = await db.query(
                    'UPDATE guilds SET role_id = ? WHERE guild_id = ? AND level = ?',
                    [role.id, guildId, level]
                );

                if (updateResult.affectedRows === 0) {
                    // Записи не было — создаём
                    await db.query(
                        'INSERT INTO guilds (guild_id, level, role_id) VALUES (?, ?, ?)',
                        [guildId, level, role.id]
                    );
                }

                await interaction.reply(
                    currentRoleId
                        ? `Роль для уровня ${level} обновлена на ${role.name}!`
                        : `Роль ${role.name} установлена для уровня ${level}!`
                );
            } catch (error) {
                console.error('Ошибка в /setlevelrole set:', error);
                await interaction.reply('Ошибка при сохранении роли.');
            }

        } else if (subcommand === 'remove') {
            const level = interaction.options.getInteger('level');

            try {
                const [result] = await db.query(
                    'UPDATE guilds SET role_id = 0 WHERE guild_id = ? AND level = ?',
                    [guildId, level]
                );

                if (result.affectedRows === 0) {
                    // Если строки не было вообще — можно создать с NULL, но обычно просто говорим, что ничего не было
                    await interaction.reply(`Для уровня ${level} роли не было настроено.`);
                } else {
                    await interaction.reply(`Роль для уровня ${level} удалена!`);
                }
            } catch (error) {
                console.error('Ошибка в /setlevelrole remove:', error);
                await interaction.reply('Ошибка при удалении роли.');
            }
        }
    },
};