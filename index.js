const { Client, GatewayIntentBits, Collection } = require('discord.js');
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
});

client.commands = new Collection();

client.voiceTracker = new Map();

// === ЗАГРУЗКА КОМАНД ===

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