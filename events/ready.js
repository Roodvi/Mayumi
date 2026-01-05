module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        console.log(`Бот готов! Залогинен как ${client.user.tag}`);
        client.user.setActivity('/help', { type: 'LISTENING' });
    },
};