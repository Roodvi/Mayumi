const db = require('../db.js'); // Путь к db.js
const messageTracker = new Map();

module.exports = {
    name: 'messageCreate',
    execute(message, client) {
        if (message.author.bot || !message.guild) return;

        const userId = message.author.id;
        const guildId = message.guild.id;

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
                } else {
                    await db.query(
                        'UPDATE users SET messages_count = messages_count + 1 WHERE user_id = ? AND guild_id = ?',
                        [userId, guildId]
                    );
                }
            } catch (error) {
                console.error('Ошибка при обработке сообщения в БД:', error);
            }
        })();

        // === Система XP/Level ===
        if (message.author.bot || !message.guild) return;
        const key = `${userId}-${guildId}`;

        const now = Date.now();

        let tracker = messageTracker.get(key) || { timestamps: [], cooldownEnd: null };

        if (tracker.cooldownEnd && now < tracker.cooldownEnd) {
            return; // На задержке — игнор XP
        }

        // Добавляем timestamp сообщения
        tracker.timestamps.push(now);
        tracker.timestamps = tracker.timestamps.filter(t => now - t < 30000); // Только последние 30 сек

        // Проверка спама: >5 сообщений в 30 сек — задержка 60 сек
        if (tracker.timestamps.length > 5) {
            tracker.cooldownEnd = now + 60000; // Задержка 60 сек
            tracker.timestamps = []; // Сброс трекера
            messageTracker.set(key, tracker);
            return; // Нет XP за спам
        }

        messageTracker.set(key, tracker);

        (async () => {
            try {
                const xpGain = Math.floor(Math.random() * 11) + 10;
                const [rows] = await db.query(
                    'SELECT xp, level, xp_to_next FROM users WHERE user_id = ? AND guild_id = ?',
                    [userId, guildId]
                );

                let currentXp = xpGain; // Базовый XP за сообщение (можно рандом 10–20)
                let currentLevel = 1;
                let xpToNext = calculateXpToNext(2);

                if (rows.length > 0) {
                    currentXp += rows[0].xp || 0;
                    currentLevel = rows[0].level || 1;
                    xpToNext = rows[0].xp_to_next || calculateXpToNext(currentLevel + 1);
                }

                // Проверка на ап уровня
                while (currentXp >= xpToNext) {
                    currentXp -= xpToNext;
                    currentLevel++;
                    xpToNext = calculateXpToNext(currentLevel + 1);

                    // Можно добавить уведомление о апе уровня
                    message.channel.send(`Юху ${message.author}, ты повысил новый уровень **${currentLevel}** давай в том-же духе. 🎉`);
                }

                // Обновляем БД
                await db.query(
                    'UPDATE users SET xp = ?, level = ?, xp_to_next = ?, messages_count = messages_count + 1 WHERE user_id = ? AND guild_id = ?',
                    [currentXp, currentLevel, xpToNext, userId, guildId]
                );
            } catch (error) {
                console.error('Ошибка XP за сообщение:', error);
            }
        })();
    },
};

// Формула XP на следующий уровень
function calculateXpToNext(nextLevel) {
    return nextLevel * nextLevel * 100 + 200;
}