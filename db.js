const mysql = require('mysql2/promise');

// Настройки подключения (замени на свои)
const pool = mysql.createPool({
    host: 'localhost',        // Или IP хостинга
    user: 'botuser',          // Юзер, которого создал (или root для тестов)
    password: 'CXR2moE8',  // Сильный пароль
    database: 'botdb',        // Имя БД
    waitForConnections: true,
    connectionLimit: 10,      // Макс соединений
    queueLimit: 0
});

module.exports = pool;