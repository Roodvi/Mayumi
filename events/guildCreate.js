const { EmbedBuilder, WebhookClient, AuditLogEvent } = require('discord.js');
const webhookClient = new WebhookClient({ id: '947058805194227752', token: 'eF9u6tB5dFyuisdEuSI5cFcFSZ0v8yeJMFj3SQ3V8Lf9tnqZf1dODLWAeXmucFCXFUfS' });
const db = require('../db.js'); // Путь к db.js

module.exports = {
    name: 'guildCreate',
    async execute(guild, client) {
        try {
            const [rows] = await db.query(
                'SELECT * FROM guilds WHERE guild_id = ?',
                [guild.id]
            );

            if (rows.length === 0) {
                await db.query(
                    'INSERT INTO guilds (guild_id) VALUES (?)',
                    [guild.id]
                );
            }
        } catch (error) {
            console.error('Ошибка при обработке сообщения в БД:', error);
        }

        let humanCount = guild.memberCount;
        let botCount // fallback на общее, если fetch упадёт
        try {
            await guild.members.fetch(); // Загружаем кэш членов
            humanCount = guild.members.cache.filter(member => !member.user.bot).size;
            botCount = guild.members.cache.filter(member => member.user.bot).size;
        } catch (err) {
            console.error('Ошибка fetch членов при join:', err);
            // Если ошибка — используем общее memberCount
        }

        let inviter = 'Неизвестно';

        try {
            const auditLogs = await guild.fetchAuditLogs({
                type: AuditLogEvent.BotAdd,
                limit: 1
            });

            const entry = auditLogs.entries.first();
            if (entry && entry.target.id === client.user.id) {
                inviter = entry.executor ? `${entry.executor.tag} (${entry.executor.id})` : 'Неизвестно';
            }
        } catch (error) {
            console.error('Ошибка чтения audit log при join:', error);
        }

        const embed = new EmbedBuilder()
            .setColor(0x00FFFF) // Голубой
            .setTitle(`🔵 Я был добавлен на сервер - ${guild.name} | ${guild.id}`)
            .setDescription(`**Информация о домике:**\nУчастников:\nВсего: **${guild.memberCount}**\nЛюдей: **${humanCount}**\nБотов: **${botCount}**\nДата создания домика: <t:${Math.floor(guild.createdTimestamp / 1000)}>\nКто добавил бота: **${inviter}**`)
            .setTimestamp();

        // Отправка через вебхук
        webhookClient.send({
            username: guild.name,
            avatarURL: guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL({ dynamic: true }),
            embeds: [embed],
        });
    },
};