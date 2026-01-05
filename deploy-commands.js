const { REST, Routes } = require('discord.js');
const { clientId, token } = require('./config.json');
const fs = require('node:fs');
const path = require('node:path');

function getCommands(dir, commandsArray = []) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.lstatSync(fullPath);

        if (stat.isDirectory()) {
            getCommands(fullPath, commandsArray);
        } else if (file.endsWith('.js')) {
            const command = require(fullPath);
            if ('data' in command && 'execute' in command) {
                commandsArray.push(command.data.toJSON());
            }
        }
    }

    return commandsArray;
}

const commandsPath = path.join(__dirname, 'commands');
const commands = [];

if (fs.existsSync(commandsPath)) {
    getCommands(commandsPath, commands);
    console.log(`Найдено ${commands.length} команд`);
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('Регистрация команд...');

        const registered = await rest.put(Routes.applicationCommands(clientId), { body: commands });

        console.log(`Зарегистрировано ${registered.length} команд`);

        // Сохраняем ID в JSON
        const commandIds = {};
        registered.forEach(cmd => {
            commandIds[cmd.name] = cmd.id;
        });

        fs.writeFileSync(path.join(__dirname, 'commandIds.json'), JSON.stringify(commandIds, null, 4));
        console.log('ID команд сохранены в commandIds.json');

    } catch (error) {
        console.error(error);
    }
})();