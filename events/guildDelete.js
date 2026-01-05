const { EmbedBuilder, WebhookClient } = require('discord.js');

const webhookClient = new WebhookClient({ id: '947058805194227752', token: 'eF9u6tB5dFyuisdEuSI5cFcFSZ0v8yeJMFj3SQ3V8Lf9tnqZf1dODLWAeXmucFCXFUfS' });

module.exports = {
    name: 'guildDelete',
    async execute(guild, client) {


        const embed = new EmbedBuilder()
            .setColor(0xFF0000) // Красный для удаления
            .setTitle(`🔴 Я был удален с сервера - ${guild.name} | ${guild.id}`)
            .setDescription(`**Информация о домике:**\nУчастников:\nВсего: **${guild.memberCount}**\nЛюдей: **${guild.members.cache.filter(member => !member.user.bot).size}**\nБотов: **${guild.members.cache.filter(member => member.user.bot).size}**\nДата создания домика: <t:${Math.floor(guild.createdTimestamp / 1000)}>`)
            .setTimestamp();

        webhookClient.send({
            username: guild.name,
            avatarURL: guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL({ dynamic: true }),
            embeds: [embed],
        });
    },
};