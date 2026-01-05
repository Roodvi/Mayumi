const { REST, Routes } = require('discord.js');
const { token, clientId } = require('./config.json'); // Укажи clientId и token СТАРОГО бота Morfi!

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('Удаляю все глобальные команды...');

        // Удаляет ВСЕ глобальные slash-команды приложения
        await rest.put(Routes.applicationCommands(clientId), { body: [] });

        console.log('Все глобальные команды успешно удалены!');
    } catch (error) {
        console.error(error);
    }
})();