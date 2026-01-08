const { WebhookClient, EmbedBuilder } = require('discord.js');
const webhookClient = new WebhookClient({ id: '1342087309444780032', token: 'tq6cT0btH4NAgiRI4U5FX73ag5C06bXFbPuZlmc6KLldQLELEG64nuLim4gnk81vDkUc' });
const webhookClientERR = new WebhookClient({ id: '947051456735871026', token: 'F88l8B_zdyjvEhtZH9Qk4ShgVd-VS9J5BWhq4SjyrNTMtCfyqLRkeYlRSmO28nLpqhfX' });
const db = require('../db.js'); // Путь к db.js

module.exports = {
    name: 'interactionCreate',
    execute(interaction, client,) {
        (async () => {
            if (!interaction.isChatInputCommand()) return;

            const command = client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`Команда ${interaction.commandName} не найдена.`);
                return;
            }

            const guildId = interaction.guild?.id || null; // Если DM — null, но для команд обычно guild
            const userId = interaction.user.id;

            (async () => {
                try {
                    const [rows] = await db.query(
                        'SELECT * FROM users WHERE user_id = ? AND guild_id = ?',
                        [userId, guildId]
                    );

                    if (rows.length === 0) {
                        await db.query(
                            'INSERT INTO users (user_id, guild_id) VALUES (?, ?)',
                            [userId, guildId]
                        );
                    }
                } catch (error) {
                    console.error('Ошибка при обработке сообщения в БД:', error);
                }
            })();



            try {
                await command.execute(interaction);
                console.log(`Выполнена команда /${interaction.commandName} от ${interaction.user.tag}`);

                // Лог использования команды в вебхук
                const [rows] = await db.query('SELECT * FROM users WHERE user_id = ? AND guild_id = ?',
                    [userId, guildId]
                );
                const logEmbed = new EmbedBuilder()
                    .setColor(0x00FF00) // Зелёный для использования команды
                    .setAuthor({ name: `${interaction.user.globalName} | #${rows[0].command_uses + 1 || 0}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
                    .addFields(
                        { name: 'Пользователь', value: `> ${interaction.user} | \`${interaction.user.tag}\``, inline: true },
                        { name: 'Использовал команду', value: `> /${interaction.commandName}`, inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'Automatic System.', iconURL: client.user.displayAvatarURL({ dynamic: true }) });

                webhookClient.send({
                    username: interaction.guild.name,
                    avatarURL: interaction.guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL({ dynamic: true }),
                    embeds: [logEmbed]
                }).catch(err => console.error('Ошибка отправки лога команды:', err));

                if (!guildId) return; // Если DM — не считаем (или настрой под себя)
                await db.query(
                    `UPDATE users SET command_uses = command_uses + 1 WHERE user_id = ? AND guild_id = ?`,
                    [userId, guildId]
                );

            } catch (error) {
                console.error(`Ошибка при выполнении команды ${interaction.commandName}:`, error);

                const serverName = interaction.guild ? `${interaction.guild.name} (${interaction.guild.id})` : 'Личные сообщения (DM)';
                const stack = String(error?.stack || error).slice(0, 900);

                const errorEmbed = new EmbedBuilder()
                    .setColor(0xFF0000) // Красный для ошибки
                    .setTitle('Ошибка в команде')
                    .addFields(
                        { name: 'Команда', value: `/${interaction.commandName}`, inline: false },
                        { name: 'Пользователь', value: `${interaction.user.tag} (${interaction.user.id})`, inline: false },
                        { name: 'Сервер', value: serverName, inline: false },
                        { name: 'Ошибка', value: `\`\`\`${stack || error.message || 'Нет деталей'}\`\`\``, inline: false }
                    )
                    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                    .setTimestamp();

                webhookClientERR.send({ embeds: [errorEmbed] }).catch(console.error);

                // Ответ пользователю
                const reply = { content: 'Произошла ошибка при выполнении команды!', ephemeral: true };
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(reply);
                } else {
                    await interaction.reply(reply);
                }
            }
        })();
    },
};