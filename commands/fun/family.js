const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../db.js');

module.exports = {
    category: 'family',
    data: new SlashCommandBuilder()
        .setName('family')
        .setDescription('Система семьи: свадьбы, родители, дети, история и бюджет')
        .addSubcommand(sub => sub
            .setName('view')
            .setDescription('Посмотреть семейную карточку'))
        .addSubcommand(sub => sub
            .setName('marry')
            .setDescription('Предложить выйти замуж/жениться')
            .addUserOption(opt => opt
                .setName('user')
                .setDescription('Кому сделать предложение')
                .setRequired(true))),
    async execute(interaction) {
        await interaction.deferReply();
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        // Создаём запись для текущего пользователя, если её нет
        await db.query('INSERT IGNORE INTO family (guild_id, user_id) VALUES (?, ?)', [guildId, interaction.user.id]);

        // Эмодзи валюты
        const [guildRows] = await db.query('SELECT emoji FROM guilds WHERE guild_id = ?', [guildId]);
        const currencyEmoji = guildRows.length > 0 && guildRows[0].emoji ? guildRows[0].emoji : '💎';

        // ==================== VIEW SUBCOMMAND START ====================
        if (sub === 'view') {
            const target = interaction.options.getUser('user') || interaction.user;
            const userId = target.id;

            await db.query('INSERT IGNORE INTO family (guild_id, user_id) VALUES (?, ?)', [guildId, userId]);

            const [familyRows] = await db.query('SELECT spouse_id, father_id, mother_id, children, family_balance, family_history, banner_url, user_id, marriage_date FROM family WHERE guild_id = ? AND user_id = ?', [guildId, userId]);

            const row = familyRows[0];

            let spouseValue = 'Свободен(а)! ❤️\nМожно сделать предложение через `/family marry @user`';
            let spousesValue = 'Свободен(а)! ❤️\nМожно сделать предложение через `/family marry @user`';
            let marriageTime = '';
            if (row.spouse_id) {
                const spouseUser = await interaction.client.users.fetch(row.spouse_id).catch(() => null);
                const spousesUser = await interaction.client.users.fetch(row.user_id).catch(() => null);
                spouseValue = spouseUser ? spouseUser.toString() : 'Неизвестно';
                spousesValue = spousesUser ? spousesUser.toString() : 'Неизвестно';

                if (row.marriage_date) {
                    const days = Math.floor((Date.now() - row.marriage_date) / 86400000);
                    const years = Math.floor(days / 365);
                    const remainingDays = days % 365;
                    marriageTime = years > 0 ? `${years} лет, ${remainingDays} дней` : `${remainingDays} дней`;
                }
            }


            let father = 'Не указан.';
            if (row.father_id) {
                const fatherUser = await interaction.client.users.fetch(row.father_id).catch(() => null);
                father = fatherUser ? fatherUser.toString() : 'Неизвестно';
            }

            let mother = 'Не указана.';
            if (row.mother_id) {
                const motherUser = await interaction.client.users.fetch(row.mother_id).catch(() => null);
                mother = motherUser ? motherUser.toString() : 'Неизвестно';
            }

            let children = 'Не указаны.';
            if (row.children && row.children !== '[]') {
                const childIds = JSON.parse(row.children);
                const mentions = [];
                for (const id of childIds) {
                    const childUser = await interaction.client.users.fetch(id).catch(() => null);
                    if (childUser) mentions.push(childUser.toString());
                }
                children = mentions.join(', ') || 'Не указаны.';
            }

            const history = row.family_history || 'История ещё не рассказана.';
            const familyBalance = row.family_balance || 0;

            const embed = new EmbedBuilder()
                .setTitle('Семейная карточка')
                .setColor(0xFF69B4)
                .setDescription(`Брак пользователей:\n${spousesValue}/${spouseValue}`)
                .addFields(
                    { name: 'История', value: `\`\`\`${history}\`\`\`` },
                    { name: 'Семейное древо:', value: `Родители ${spousesValue}\n󠂪 󠂪󠂪 󠂪󠂪 󠂪󠂪 󠂪󠂪 󠂪󠂪 Отец: ${father} 󠂪󠂪 󠂪󠂪 󠂪󠂪 󠂪󠂪 󠂪 󠂪󠂪 󠂪󠂪 󠂪󠂪 󠂪󠂪 󠂪󠂪 Мать: Не указана.\n\nРодители ${spouseValue}\n󠂪 󠂪󠂪 󠂪󠂪 󠂪󠂪 󠂪󠂪 󠂪󠂪 Отец: Не указан. 󠂪󠂪 󠂪󠂪 󠂪󠂪 󠂪󠂪 󠂪 󠂪󠂪 󠂪󠂪 󠂪󠂪 󠂪󠂪 󠂪󠂪 Мать: Не указана.\n\nДети: ${children}` },
                    { name: 'Всего вместе', value: `${marriageTime}`, inline: true },
                    { name: 'Бюджет', value: `${row.family_balance || 0}${currencyEmoji}`, inline: true },
                )
            //.setFooter({ text: `Дата регистрации: ${row.marriage_date.toLocaleDateString('ru-RU')}` });

            if (row.banner_url) {
                embed.setImage(row.banner_url);
            }

            const components = [];
            const isMarried = row.spouse_id !== null;
            const isOwnerOrSpouse = interaction.user.id === userId || interaction.user.id === row.spouse_id;

            if (isMarried && isOwnerOrSpouse) {
                const row1 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('family_topup')
                            .setLabel('Пополнить баланс')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId('family_history')
                            .setLabel(row.family_history ? 'Изменить историю' : 'Добавить историю')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('family_divorce')
                            .setLabel('Развестись')
                            .setStyle(ButtonStyle.Danger)
                    );
                components.push(row1);

                const row2 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('family_banner')
                            .setLabel('Изменить баннер')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('family_addparent')
                            .setLabel(row.father_id || row.mother_id ? 'Изменить родителей' : 'Добавить родителя')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('family_addchild')
                            .setLabel(row.children && row.children !== '[]' ? 'Изменить детей' : 'Добавить ребёнка')
                            .setStyle(ButtonStyle.Secondary)
                    );
                components.push(row2);
            }

            const message = await interaction.editReply({ embeds: [embed], components });

            if (components.length === 0) return;

            const collector = message.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 600000
            });

            collector.on('collect', async i => {
                // Модалы для пополнения, истории, баннера, родителей, детей
                if (i.customId === 'family_topup' || i.customId === 'family_history' || i.customId === 'family_banner' || i.customId === 'family_addparent' || i.customId === 'family_addchild') {
                    let modal;
                    if (i.customId === 'family_topup') {
                        modal = new ModalBuilder()
                            .setCustomId('family_topup_modal')
                            .setTitle('Пополнить семейный баланс');

                        const amountInput = new TextInputBuilder()
                            .setCustomId('amount')
                            .setLabel('Сумма для пополнения')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true);

                        modal.addComponents(new ActionRowBuilder().addComponents(amountInput));
                    } else if (i.customId === 'family_history') {
                        modal = new ModalBuilder()
                            .setCustomId('family_history_modal')
                            .setTitle(row.family_history ? 'Изменить историю' : 'Добавить историю');

                        const historyInput = new TextInputBuilder()
                            .setCustomId('history')
                            .setLabel('Текст истории семьи')
                            .setStyle(TextInputStyle.Paragraph)
                            .setValue(row.family_history || '')
                            .setRequired(false);

                        modal.addComponents(new ActionRowBuilder().addComponents(historyInput));
                    } else if (i.customId === 'family_banner') {
                        modal = new ModalBuilder()
                            .setCustomId('family_banner_modal')
                            .setTitle('Изменить баннер семьи');

                        const urlInput = new TextInputBuilder()
                            .setCustomId('url')
                            .setLabel('URL картинки (прямая ссылка)')
                            .setStyle(TextInputStyle.Short)
                            .setValue(row.banner_url || '')
                            .setRequired(false);

                        modal.addComponents(new ActionRowBuilder().addComponents(urlInput));
                    } else if (i.customId === 'family_addparent') {
                        modal = new ModalBuilder()
                            .setCustomId('family_addparent_modal')
                            .setTitle('Добавить/Изменить родителя');

                        const typeInput = new TextInputBuilder()
                            .setCustomId('type')
                            .setLabel('Тип (отец или мать)')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true);

                        const nameInput = new TextInputBuilder()
                            .setCustomId('name')
                            .setLabel('GlobalName родителя')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true);

                        modal.addComponents(new ActionRowBuilder().addComponents(typeInput));
                        modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
                    } else if (i.customId === 'family_addchild') {
                        modal = new ModalBuilder()
                            .setCustomId('family_addchild_modal')
                            .setTitle('Добавить ребёнка');

                        const nameInput = new TextInputBuilder()
                            .setCustomId('name')
                            .setLabel('GlobalName ребёнка')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true);

                        modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
                    }

                    await i.showModal(modal);
                    return;
                }

                await i.deferUpdate();

                if (i.customId === 'family_divorce') {
                    await db.query('DELETE FROM family WHERE guild_id = ? AND user_id = ?', [guildId, userId]);
                    if (row.spouse_id) {
                        await db.query('DELETE FROM family WHERE guild_id = ? AND user_id = ?', [guildId, row.spouse_id]);
                    }

                    const divorceEmbed = new EmbedBuilder()
                        .setTitle('💔 Развод')
                        .setDescription('Вы развелись. Все данные семьи удалены.')
                        .setColor(0xFF0000);

                    await i.editReply({ embeds: [divorceEmbed], components: [] });
                }
            });

            collector.on('end', async () => {
                const disabledComponents = components.map(row => {
                    row.components.forEach(comp => comp.setDisabled(true));
                    return row;
                });
                const endedEmbed = embed
                    .setFooter({ text: 'Время взаимодействия истекло' });

                await interaction.editReply({ embeds: [endedEmbed], components: disabledComponents }).catch(() => {});
            });

            return;
        }
        // ==================== VIEW SUBCOMMAND END ====================

        // ==================== MARRY SUBCOMMAND START ====================
        if (sub === 'marry') {
            const target = interaction.options.getUser('user');

            if (target.id === interaction.user.id) {
                return interaction.editReply('Нельзя сделать предложение себе! 🥺');
            }
            if (target.bot) {
                return interaction.editReply('Ботам нельзя делать предложения — они уже женаты на коде! 🤖💕');
            }

            await db.query('INSERT IGNORE INTO family (guild_id, user_id) VALUES (?, ?)', [guildId, target.id]);

            const [proposerRows] = await db.query('SELECT spouse_id FROM family WHERE guild_id = ? AND user_id = ?', [guildId, interaction.user.id]);
            if (proposerRows[0].spouse_id) {
                return interaction.editReply('Вы уже женаты! Сначала разведитеcь через кнопку в карточке.');
            }

            const [targetRows] = await db.query('SELECT spouse_id FROM family WHERE guild_id = ? AND user_id = ?', [guildId, target.id]);
            if (targetRows[0].spouse_id) {
                return interaction.editReply(`${target} уже женат/замужем!`);
            }

            const embed = new EmbedBuilder()
                .setTitle('💍 Предложение о свадьбе!')
                .setDescription(`${interaction.user} предлагает ${target} выйти замуж/жениться! ❤️\n\n${target}, ты согласен/согласна?`)
                .setColor(0xFF69B4);

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('marry_accept')
                        .setLabel('Принять 💕')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('marry_decline')
                        .setLabel('Отказаться 😢')
                        .setStyle(ButtonStyle.Danger)
                );

            const message = await interaction.editReply({ embeds: [embed], components: [row] });

            const collector = message.createMessageComponentCollector({ time: 60000 });

            collector.on('collect', async i => {
                if (i.user.id !== target.id) {
                    await i.reply({ content: 'Это предложение не для тебя! 😅', ephemeral: true });
                    return;
                }

                await i.deferUpdate();

                if (i.customId === 'marry_accept') {
                    const now = Date.now();

                    await db.query('UPDATE family SET spouse_id = ?, marriage_date = ? WHERE guild_id = ? AND user_id = ?', [target.id, now, guildId, interaction.user.id]);
                    await db.query('UPDATE family SET spouse_id = ?, marriage_date = ? WHERE guild_id = ? AND user_id = ?', [interaction.user.id, now, guildId, target.id]);

                    const successEmbed = new EmbedBuilder()
                        .setTitle('💒 Свадьба!')
                        .setDescription(`${interaction.user} и ${target} теперь женаты! Поздравляю! ❤️🎉`)
                        .setColor(0xFF69B4);

                    await i.editReply({ embeds: [successEmbed], components: [] });
                } else if (i.customId === 'marry_decline') {
                    const declineEmbed = new EmbedBuilder()
                        .setDescription(`${target} отказал(а) ${interaction.user}... 💔`)
                        .setColor(0xFF0000);

                    await i.editReply({ embeds: [declineEmbed], components: [] });
                }
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    const timeoutEmbed = new EmbedBuilder()
                        .setDescription('Время на ответ истекло — предложение отклонено ⏰')
                        .setColor(0x808080);

                    interaction.editReply({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
                }
            });

            return;
        }
        // ==================== MARRY SUBCOMMAND END ====================
    },
};