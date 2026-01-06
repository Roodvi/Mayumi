const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../db.js');

module.exports = {
    category: 'economy',
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Магазин ролей')
        .addSubcommand(sub => sub
            .setName('view')
            .setDescription('Посмотреть магазин'))
        .addSubcommand(sub => sub
            .setName('add')
            .setDescription('Добавить роль в магазин (только для админов)')
            .addStringOption(opt => opt
                .setName('item_id')
                .setDescription('Уникальный ID предмета (например, vip)')
                .setRequired(true))
            .addIntegerOption(opt => opt
                .setName('price')
                .setDescription('Цена в валюте сервера')
                .setRequired(true)
                .setMinValue(1))
            .addRoleOption(opt => opt
                .setName('role')
                .setDescription('Роль для покупки')
                .setRequired(true)))
        .addSubcommand(sub => sub
            .setName('remove')
            .setDescription('Удалить роль из магазина (только для админов)')
            .addStringOption(opt => opt
                .setName('item_id')
                .setDescription('ID предмета для удаления')
                .setRequired(true))),
    async execute(interaction) {
        await interaction.deferReply();
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (['add', 'remove'].includes(sub)) {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.editReply('Эта подкоманда доступна только администраторам!');
            }
        }

        // Эмодзи валюты из guilds (fallback 💎)
        const [guildRows] = await db.query('SELECT emoji FROM guilds WHERE guild_id = ?', [guildId]);
        const currencyEmoji = guildRows.length > 0 && guildRows[0].emoji ? guildRows[0].emoji : '💎';

        if (sub === 'view') {
            const [allItems] = await db.query('SELECT item_id, role_id, price FROM shop_items WHERE guild_id = ? ORDER BY price DESC', [guildId]);

            // Fetch всех ролей для актуальных имён
            const roles = await interaction.guild.roles.fetch();

            const itemsPerPage = 25;
            let currentPage = 0;
            const maxPage = Math.ceil(allItems.length / itemsPerPage) || 1;

            const generateEmbed = (page) => {
                const start = page * itemsPerPage;
                const end = start + itemsPerPage;
                const pageItems = allItems.slice(start, end);

                const embed = new EmbedBuilder()
                    .setTitle('⊹──⊱✠~Виртуальный Магазин~✠⊰──⊹')
                    .setColor(0x9B59B6)
                    .setFooter({ text: `Страница ${page + 1}/${maxPage}` });

                if (pageItems.length === 0) {
                    embed.setDescription('Магазин пуст! Администраторы могут добавить роли через `/shop add`.');
                    return embed;
                }

                pageItems.forEach((item, index) => {
                    const role = roles.get(item.role_id);
                    const roleName = role ? role.name : 'Неизвестная роль';
                    const roleMention = role ? `<@&${item.role_id}>` : 'Роль удалена';

                    embed.addFields({
                        name: `No${start + index + 1}. Цена: ${item.price}${currencyEmoji}`,
                        value: roleMention,
                        inline: false
                    });
                });

                return embed;
            };

            const generateComponents = (page) => {
                const start = page * itemsPerPage;
                const end = start + itemsPerPage;
                const pageItems = allItems.slice(start, end);

                const rows = [];

                let buyRow1 = new ActionRowBuilder();
                let buyRow2 = new ActionRowBuilder();
                pageItems.forEach((item, index) => {
                    const role = roles.get(item.role_id);
                    const roleName = role ? role.name : 'Неизвестная роль';

                    const button = new ButtonBuilder()
                        .setCustomId(`shop_buy_${item.item_id}`)
                        .setLabel(`Купить ${roleName} за ${item.price}`)
                        .setStyle(ButtonStyle.Primary);

                    if (index < 5) {
                        buyRow1.addComponents(button);
                    } else {
                        buyRow2.addComponents(button);
                    }
                });
                if (buyRow1.components.length > 0) rows.push(buyRow1);
                if (buyRow2.components.length > 0) rows.push(buyRow2);

                const paginationRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('shop_prev')
                            .setLabel('←')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(page === 0),
                        new ButtonBuilder()
                            .setCustomId(`shop_page_${page}`)
                            .setLabel(`${page + 1}`)
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId('shop_next')
                            .setLabel('→')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(page === maxPage - 1)
                    );

                rows.push(paginationRow);
                return rows;
            };

            const embed = generateEmbed(currentPage);
            const components = allItems.length === 0 ? [] : generateComponents(currentPage);

            const message = await interaction.editReply({ embeds: [embed], components });

            if (allItems.length === 0) return;

            const collector = message.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 600000
            });

            collector.on('collect', async i => {
                await i.deferUpdate();

                if (i.customId === 'shop_prev') {
                    currentPage--;
                } else if (i.customId === 'shop_next') {
                    currentPage++;
                } else if (i.customId.startsWith('shop_page_')) {
                    currentPage = parseInt(i.customId.split('_')[2]);
                } else if (i.customId.startsWith('shop_buy_')) {
                    const itemId = i.customId.slice(9);
                    const [items] = await db.query('SELECT * FROM shop_items WHERE guild_id = ? AND item_id = ?', [guildId, itemId]);
                    if (items.length === 0) {
                        await i.followUp({ content: 'Предмет не найден!', ephemeral: true });
                        return;
                    }
                    const item = items[0];

                    const userId = i.user.id;
                    const [userRows] = await db.query('SELECT balance FROM users WHERE user_id = ? AND guild_id = ?', [userId, guildId]);
                    if (userRows.length === 0 || userRows[0].balance < item.price) {
                        await i.followUp({ content: `Недостаточно денег! Нужно ${item.price}${currencyEmoji}, у вас ${userRows[0]?.balance || 0}${currencyEmoji}`, ephemeral: true });
                        return;
                    }

                    const role = await i.guild.roles.fetch(String(item.role_id)).catch(() => null);
                    if (!role) {
                        await i.followUp({ content: 'Роль не найдена на сервере (возможно, удалена).', ephemeral: true });
                        return;
                    }

                    const botMember = i.guild.members.me;

                    // Проверка прав бота
                    if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
                        await i.followUp({ content: 'У меня нет прав на управление ролями!', ephemeral: true });
                        return;
                    }

                    if (role.position >= botMember.roles.highest.position) {
                        await i.followUp({ content: 'Эта роль выше моей высшей роли — я не могу её выдать!', ephemeral: true });
                        return;
                    }

                    const member = i.member;
                    if (member.roles.cache.has(role.id)) {
                        await i.followUp({ content: 'У вас уже есть эта роль!', ephemeral: true });
                        return;
                    }

                    await db.query('UPDATE users SET balance = balance - ? WHERE user_id = ? AND guild_id = ?', [item.price, userId, guildId]);
                    await member.roles.add(role);

                    await i.followUp({ content: `✅ Вы успешно купили ${role} за ${item.price}${currencyEmoji}!`, ephemeral: true });
                    return;
                }

                const newEmbed = generateEmbed(currentPage);
                const newComponents = generateComponents(currentPage);
                await i.editReply({ embeds: [newEmbed], components: newComponents });
            });

            collector.on('end', async () => {
                const disabledComponents = generateComponents(currentPage).map(row => {
                    row.components.forEach(comp => comp.setDisabled(true));
                    return row;
                });
                const endedEmbed = generateEmbed(currentPage)
                    .setFooter({ text: 'Время взаимодействия истекло' });

                await interaction.editReply({ embeds: [endedEmbed], components: disabledComponents }).catch(() => {});
            });

            return;
        }

        if (sub === 'add') {
            const itemId = interaction.options.getString('item_id');
            const price = interaction.options.getInteger('price');
            const role = interaction.options.getRole('role');

            const botMember = interaction.guild.members.me;

            // Проверка при добавлении (чтобы не добавить роль, которую бот не сможет выдать)
            if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
                return interaction.editReply('У меня нет прав на управление ролями — я не смогу выдавать роли из магазина!');
            }

            if (role.position >= botMember.roles.highest.position) {
                return interaction.editReply('Эта роль выше или на уровне моей высшей роли — я не смогу её выдавать!');
            }

            const [existingById] = await db.query('SELECT item_id FROM shop_items WHERE guild_id = ? AND item_id = ?', [guildId, itemId]);
            if (existingById.length > 0) {
                return interaction.editReply(`Предмет с ID \`${itemId}\` уже существует!`);
            }

            const [existingByRole] = await db.query('SELECT item_id FROM shop_items WHERE guild_id = ? AND role_id = ?', [guildId, role.id]);
            if (existingByRole.length > 0) {
                return interaction.editReply(`Эта роль уже есть в магазине под ID \`${existingByRole[0].item_id}\`!`);
            }

            await db.query('INSERT INTO shop_items (guild_id, item_id, price, role_id) VALUES (?, ?, ?, ?)', [guildId, itemId, price, role.id]);

            await interaction.editReply(`✅ Роль ${role} (ID: \`${itemId}\`) добавлена в магазин за ${price}${currencyEmoji}!`);
        }

        if (sub === 'remove') {
            const itemId = interaction.options.getString('item_id');

            const [result] = await db.query('DELETE FROM shop_items WHERE guild_id = ? AND item_id = ?', [guildId, itemId]);
            if (result.affectedRows === 0) {
                return interaction.editReply(`Предмет с ID \`${itemId}\` не найден в магазине!`);
            }

            await interaction.editReply(`✅ Предмет с ID \`${itemId}\` удалён из магазина!`);
        }
    },
};