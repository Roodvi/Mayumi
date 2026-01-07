const { Client, GatewayIntentBits, Collection, ChannelType, PermissionsBitField, Partials } = require('discord.js');
const { token } = require('./config.json');
const db = require('./db.js');
const fs = require('node:fs');
const path = require('node:path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [
        Partials.Channel,       // Для каналов (voice)
        Partials.GuildMember,   // Для мемберов гильдии
        Partials.User           // Для пользователей
    ]
});

client.commands = new Collection();

client.voiceTracker = new Map();

// === ЗАГРУЗКА КОМАНД ===

client.on('interactionCreate', async modalInteraction => {
    if (!modalInteraction.isModalSubmit()) return;

    const guildId = modalInteraction.guild.id;
    const userId = modalInteraction.user.id;

    // Получаем супруга
    const [familyRows] = await db.query('SELECT spouse_id FROM family WHERE guild_id = ? AND user_id = ?', [guildId, userId]);
    const spouseId = familyRows.length > 0 && familyRows[0].spouse_id ? familyRows[0].spouse_id : null;

    const [guildRows] = await db.query('SELECT emoji FROM guilds WHERE guild_id = ?', [guildId]);
    const currencyEmoji = guildRows.length > 0 && guildRows[0].emoji ? guildRows[0].emoji : '💎';

    if (modalInteraction.customId === 'family_topup_modal') {
        const amount = parseInt(modalInteraction.fields.getTextInputValue('amount'));
        if (isNaN(amount) || amount <= 0) {
            return modalInteraction.reply({ content: 'Неверная сумма!', ephemeral: true });
        }

        const [userRows] = await db.query('SELECT balance FROM users WHERE user_id = ? AND guild_id = ?', [userId, guildId]);
        if (userRows.length === 0 || userRows[0].balance < amount) {
            return modalInteraction.reply({ content: 'Недостаточно денег на личном балансе!', ephemeral: true });
        }

        await db.query('UPDATE users SET balance = balance - ? WHERE user_id = ? AND guild_id = ?', [amount, userId, guildId]);
        await db.query('UPDATE family SET family_balance = family_balance + ? WHERE guild_id = ? AND user_id = ?', [amount, guildId, userId]);
        if (spouseId) {
            await db.query('UPDATE family SET family_balance = family_balance + ? WHERE guild_id = ? AND user_id = ?', [amount, guildId, spouseId]);
        }

        await modalInteraction.reply({ content: `✅ Пополнили семейный баланс на ${amount}${currencyEmoji}!`, ephemeral: true });
    }

    if (modalInteraction.customId === 'family_history_modal') {
        const history = modalInteraction.fields.getTextInputValue('history').trim();

        await db.query('UPDATE family SET family_history = ? WHERE guild_id = ? AND user_id = ?', [history || null, guildId, userId]);
        if (spouseId) {
            await db.query('UPDATE family SET family_history = ? WHERE guild_id = ? AND user_id = ?', [history || null, guildId, spouseId]);
        }

        await modalInteraction.reply({ content: history ? 'История обновлена!' : 'История удалена!', ephemeral: true });
    }

    if (modalInteraction.customId === 'family_banner_modal') {
        const url = modalInteraction.fields.getTextInputValue('url').trim();

        await db.query('UPDATE family SET banner_url = ? WHERE guild_id = ? AND user_id = ?', [url || null, guildId, userId]);
        if (spouseId) {
            await db.query('UPDATE family SET banner_url = ? WHERE guild_id = ? AND user_id = ?', [url || null, guildId, spouseId]);
        }

        await modalInteraction.reply({ content: url ? 'Баннер обновлён!' : 'Баннер удалён!', ephemeral: true });
    }

    if (modalInteraction.customId === 'family_addparent_modal') {
        const typeStr = modalInteraction.fields.getTextInputValue('type').trim().toLowerCase();
        const name = modalInteraction.fields.getTextInputValue('name').trim();

        const type = typeStr === 'отец' || typeStr === 'father' ? 'father' : 'mother';

        const members = await modalInteraction.guild.members.fetch({ query: name, limit: 1 });
        if (members.size === 0) {
            return modalInteraction.reply({ content: 'Пользователь с таким именем не найден на сервере!', ephemeral: true });
        }

        const member = members.first();
        const parentId = member.user.id;

        if (parentId === userId) {
            return modalInteraction.reply({ content: 'Нельзя установить себя родителем!', ephemeral: true });
        }

        if (member.user.bot) {
            return modalInteraction.reply({ content: 'Боты не могут быть родителями!', ephemeral: true });
        }

        // Нельзя добавить супруга родителем
        if (parentId === spouseId) {
            return modalInteraction.reply({ content: 'Нельзя добавить супруга/супругу родителем!', ephemeral: true });
        }

        // Нельзя добавить женатого человека родителем
        const [parentFamily] = await db.query('SELECT spouse_id FROM family WHERE guild_id = ? AND user_id = ?', [guildId, parentId]);
        if (parentFamily.length > 0 && parentFamily[0].spouse_id) {
            return modalInteraction.reply({ content: 'Этот пользователь уже женат/замужем — нельзя добавить в семью как родителя!', ephemeral: true });
        }

        const field = type === 'father' ? 'father_id' : 'mother_id';

        const [existing] = await db.query(`SELECT ${field} FROM family WHERE guild_id = ? AND user_id = ?`, [guildId, userId]);
        if (existing[0][field]) {
            return modalInteraction.reply({ content: `У вас уже есть ${type === 'father' ? 'отец' : 'мать'}!`, ephemeral: true });
        }

        await db.query(`UPDATE family SET ${field} = ? WHERE guild_id = ? AND user_id = ?`, [parentId, guildId, userId]);

        await modalInteraction.reply({ content: `✅ ${member.user} теперь ваш ${type === 'father' ? 'отец' : 'мать'}! 👨‍👩‍👦`, ephemeral: true });
    }

    if (modalInteraction.customId === 'family_addchild_modal') {
        const name = modalInteraction.fields.getTextInputValue('name').trim();

        const members = await modalInteraction.guild.members.fetch({ query: name, limit: 1 });
        if (members.size === 0) {
            return modalInteraction.reply({ content: 'Пользователь с таким именем не найден на сервере!', ephemeral: true });
        }

        const member = members.first();
        const childId = member.user.id;

        if (childId === userId) {
            return modalInteraction.reply({ content: 'Нельзя добавить себя ребёнком!', ephemeral: true });
        }

        if (member.user.bot) {
            return modalInteraction.reply({ content: 'Боты не могут быть детьми!', ephemeral: true });
        }

        // Нельзя добавить супруга ребёнком
        if (childId === spouseId) {
            return modalInteraction.reply({ content: 'Нельзя добавить супруга/супругу ребёнком!', ephemeral: true });
        }

        // Нельзя добавить женатого человека ребёнком
        const [childFamily] = await db.query('SELECT spouse_id FROM family WHERE guild_id = ? AND user_id = ?', [guildId, childId]);
        if (childFamily.length > 0 && childFamily[0].spouse_id) {
            return modalInteraction.reply({ content: 'Этот пользователь уже женат/замужем — нельзя добавить в семью как ребёнка!', ephemeral: true });
        }

        const [rows] = await db.query('SELECT children FROM family WHERE guild_id = ? AND user_id = ?', [guildId, userId]);
        let children = rows[0].children ? JSON.parse(rows[0].children) : [];

        const childStr = childId.toString();
        if (children.includes(childStr)) {
            return modalInteraction.reply({ content: 'Этот пользователь уже ваш ребёнок!', ephemeral: true });
        }

        children.push(childStr);

        await db.query('UPDATE family SET children = ? WHERE guild_id = ? AND user_id = ?', [JSON.stringify(children), guildId, userId]);

        if (spouseId) {
            const [spouseRows] = await db.query('SELECT children FROM family WHERE guild_id = ? AND user_id = ?', [guildId, spouseId]);
            let spouseChildren = spouseRows[0].children ? JSON.parse(spouseRows[0].children) : [];

            if (!spouseChildren.includes(childStr)) {
                spouseChildren.push(childStr);
                await db.query('UPDATE family SET children = ? WHERE guild_id = ? AND user_id = ?', [JSON.stringify(spouseChildren), guildId, spouseId]);
            }
        }

        await modalInteraction.reply({ content: `✅ ${member.user} теперь ваш ребёнок! 👨‍👩‍👧`, ephemeral: true });
    }

    if (modalInteraction.customId === 'family_parent_modal') {
        const add = modalInteraction.fields.getTextInputValue('add').trim();
        const remove = modalInteraction.fields.getTextInputValue('remove').trim().toLowerCase();

        if (remove) {
            if (remove === 'отец' || remove === 'father') {
                await db.query('UPDATE family SET father_id = NULL WHERE guild_id = ? AND user_id = ?', [guildId, userId]);
            } else if (remove === 'мать' || remove === 'mother') {
                await db.query('UPDATE family SET mother_id = NULL WHERE guild_id = ? AND user_id = ?', [guildId, userId]);
            }
        }

        if (add) {
            const parts = add.split(' ');
            if (parts.length < 2) {
                return modalInteraction.reply({ content: 'Неверный формат: укажите тип и имя!', ephemeral: true });
            }

            const typeStr = parts[0].toLowerCase();
            const name = parts.slice(1).join(' ');

            const type = typeStr === 'отец' || typeStr === 'father' ? 'father' : 'mother';

            const members = await modalInteraction.guild.members.fetch({ query: name, limit: 1 });
            if (members.size === 0) {
                return modalInteraction.reply({ content: 'Пользователь не найден!', ephemeral: true });
            }

            const member = members.first();
            const parentId = member.user.id;

            if (member.user.bot) {
                return modalInteraction.reply({ content: 'Боты не могут быть родителями!', ephemeral: true });
            }

            if (parentId === userId) {
                return modalInteraction.reply({ content: 'Нельзя установить себя родителем!', ephemeral: true });
            }

            // Нельзя добавить супруга родителем
            if (parentId === spouseId) {
                return modalInteraction.reply({ content: 'Нельзя добавить супруга/супругу родителем!', ephemeral: true });
            }

            const field = type === 'father' ? 'father_id' : 'mother_id';

            const [existing] = await db.query(`SELECT ${field} FROM family WHERE guild_id = ? AND user_id = ?`, [guildId, userId]);
            if (existing[0][field]) {
                return modalInteraction.reply({ content: `У вас уже есть ${type === 'father' ? 'отец' : 'мать'}!`, ephemeral: true });
            }

            await db.query(`UPDATE family SET ${field} = ? WHERE guild_id = ? AND user_id = ?`, [parentId, guildId, userId]);
        }

        await modalInteraction.reply({ content: 'Родители обновлены!', ephemeral: true });
    }

    if (modalInteraction.customId === 'family_child_modal') {
        const add = modalInteraction.fields.getTextInputValue('add').trim();
        const remove = modalInteraction.fields.getTextInputValue('remove').trim();

        if (remove) {
            const members = await modalInteraction.guild.members.fetch({ query: remove, limit: 1 });
            if (members.size === 0) {
                return modalInteraction.reply({ content: 'Пользователь для удаления не найден!', ephemeral: true });
            }

            const member = members.first();
            const childId = member.user.id.toString();

            const [rows] = await db.query('SELECT children FROM family WHERE guild_id = ? AND user_id = ?', [guildId, userId]);
            let children = rows[0].children ? JSON.parse(rows[0].children) : [];

            if (!children.includes(childId)) {
                return modalInteraction.reply({ content: 'Этот пользователь не ваш ребёнок!', ephemeral: true });
            }

            children = children.filter(id => id !== childId);

            await db.query('UPDATE family SET children = ? WHERE guild_id = ? AND user_id = ?', [JSON.stringify(children), guildId, userId]);

            if (spouseId) {
                const [spouseRows] = await db.query('SELECT children FROM family WHERE guild_id = ? AND user_id = ?', [guildId, spouseId]);
                let spouseChildren = spouseRows[0].children ? JSON.parse(spouseRows[0].children) : [];

                spouseChildren = spouseChildren.filter(id => id !== childId);

                await db.query('UPDATE family SET children = ? WHERE guild_id = ? AND user_id = ?', [JSON.stringify(spouseChildren), guildId, spouseId]);
            }
        }

        if (add) {
            const members = await modalInteraction.guild.members.fetch({ query: add, limit: 1 });
            if (members.size === 0) {
                return modalInteraction.reply({ content: 'Пользователь для добавления не найден!', ephemeral: true });
            }

            const member = members.first();
            const childId = member.user.id.toString();

            if (member.user.id === userId) {
                return modalInteraction.reply({ content: 'Нельзя добавить себя ребёнком!', ephemeral: true });
            }

            if (member.user.bot) {
                return modalInteraction.reply({ content: 'Боты не могут быть детьми!', ephemeral: true });
            }

            // Нельзя добавить супруга ребёнком
            if (childId === spouseId?.toString()) {
                return modalInteraction.reply({ content: 'Нельзя добавить супруга/супругу ребёнком!', ephemeral: true });
            }

            const [rows] = await db.query('SELECT children FROM family WHERE guild_id = ? AND user_id = ?', [guildId, userId]);
            let children = rows[0].children ? JSON.parse(rows[0].children) : [];

            if (children.includes(childId)) {
                return modalInteraction.reply({ content: 'Этот пользователь уже ваш ребёнок!', ephemeral: true });
            }

            children.push(childId);

            await db.query('UPDATE family SET children = ? WHERE guild_id = ? AND user_id = ?', [JSON.stringify(children), guildId, userId]);

            if (spouseId) {
                const [spouseRows] = await db.query('SELECT children FROM family WHERE guild_id = ? AND user_id = ?', [guildId, spouseId]);
                let spouseChildren = spouseRows[0].children ? JSON.parse(spouseRows[0].children) : [];

                if (!spouseChildren.includes(childId)) {
                    spouseChildren.push(childId);
                    await db.query('UPDATE family SET children = ? WHERE guild_id = ? AND user_id = ?', [JSON.stringify(spouseChildren), guildId, spouseId]);
                }
            }
        }

        await modalInteraction.reply({ content: 'Дети обновлены!', ephemeral: true });
    }
});


// Рекурсивная функция загрузки команд с категориями
function loadCommands(dir, category = 'general') {
    let commandCount = 0;

    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.lstatSync(fullPath);

        if (stat.isDirectory()) {
            // Рекурсия: новая поддиректория = новая категория
            const subCategory = file.toLowerCase(); // имя папки как категория
            const subCount = loadCommands(fullPath, subCategory);
            if (subCount > 0) {
                console.log(`Загружается категория: ${file} (${subCount} команд)`);
            }
        } else if (file.endsWith('.js')) {
            const command = require(fullPath);

            if ('data' in command && 'execute' in command) {
                command.category = category; // Добавляем категорию к команде (для /help)
                client.commands.set(command.data.name, command);
                commandCount++;
            } else {
                console.log(`[ПРЕДУПРЕЖДЕНИЕ] Файл ${file} не является валидной командой`);
            }
        }
    }

    return commandCount; // Возвращаем количество загруженных в этой папке
}

// Загрузка ID команд для кликабельности
const idsPath = path.join(__dirname, 'commandIds.json');
if (fs.existsSync(idsPath)) {
    const idsData = JSON.parse(fs.readFileSync(idsPath, 'utf-8'));
    client.commandIds = new Map(Object.entries(idsData));
    console.log(`Загружено ${client.commandIds.size} ID команд для кликабельности`);
} else {
    client.commandIds = new Map();
    console.log('commandIds.json не найден — кликабельность отключена (запустите deploy-commands.js)');
}

// Запуск загрузки из корневой папки commands
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const rootCount = loadCommands(commandsPath, 'general');
    if (rootCount > 0) {
        console.log(`Загружается категория: general (${rootCount} команд)`);
    }
} else {
    console.error('Папка commands не найдена!');
}
// === КОНЕЦ ЗАГРУЗКИ ===

// === ЗАГРУЗКА ЕВЕНТОВ ===

let eventCount = 0; // Счётчик событий

function loadEvents(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.lstatSync(fullPath);

        if (stat.isDirectory()) {
            loadEvents(fullPath); // Рекурсия для поддиректорий (если добавишь)
        } else if (file.endsWith('.js')) {
            const event = require(fullPath);

            if ('name' in event && 'execute' in event) {
                if (event.once) {
                    client.once(event.name, (...args) => event.execute(...args, client));
                } else {
                    client.on(event.name, (...args) => event.execute(...args, client));
                }
                eventCount++; // Увеличиваем счётчик
            } else {
                console.log(`[ПРЕДУПРЕЖДЕНИЕ] Файл ${file} не является валидным событием`);
            }
        }
    }
}

const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    loadEvents(eventsPath);
    console.log(`Загружено событий: ${eventCount}`);
} else {
    console.error('Папка events не найдена!');
}

// === КОНЕЦ ЗАГРУЗКИ ЕВЕНТОВ ===

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

client.login(token);