const db = require('../db.js');

module.exports = {
    name: 'voiceStateUpdate',
    execute(oldState, newState, client) {
        if (newState.member.user.bot) return;

        const userId = newState.member.id;
        const guildId = newState.guild.id;
        const key = `${userId}-${guildId}`;

        // Глобальный трекер
        if (!client.voiceTracker) client.voiceTracker = new Map();

        let tracker = client.voiceTracker.get(key) || { startTime: null, channelId: null };
        client.voiceTracker.set(key, tracker);

        (async () => {
            try {
                // Вошёл в войс
                if (!oldState.channelId && newState.channelId) {
                    tracker.startTime = Date.now();
                    tracker.channelId = newState.channelId;
                }

                // Вышел из войса
                if (oldState.channelId && !newState.channelId) {
                    if (tracker.startTime) {
                        const seconds = Math.floor((Date.now() - tracker.startTime) / 1000);

                        if (seconds > 0) {
                            // Всегда записываем время (voice_time)
                            const [rows] = await db.query(
                                'SELECT voice_time, xp, level, xp_to_next FROM users WHERE user_id = ? AND guild_id = ?',
                                [userId, guildId]
                            );

                            let currentTime = seconds;
                            let currentXp = 0;
                            let currentLevel = 1;
                            let xpToNext = calculateXpToNext(2);

                            if (rows.length > 0) {
                                currentTime += rows[0].voice_time || 0;
                                currentXp = rows[0].xp || 0;
                                currentLevel = rows[0].level || 1;
                                xpToNext = rows[0].xp_to_next || calculateXpToNext(currentLevel + 1);
                            } else {
                                // Новый пользователь — создаём запись с временем
                                await db.query(
                                    'INSERT INTO users (user_id, guild_id, voice_time, xp, level, xp_to_next) VALUES (?, ?, ?, 0, 1, ?)',
                                    [userId, guildId, seconds, calculateXpToNext(2)]
                                );
                                tracker.startTime = null;
                                return;
                            }

                            // XP добавляем только если был не один (проверяем по oldState)
                            const oldChannel = client.channels.cache.get(oldState.channelId);
                            if (oldChannel) {
                                const humanCount = oldChannel.members.filter(m => !m.user.bot).size;

                                if (humanCount > 1) {
                                    const minutes = Math.floor(seconds / 60);
                                    let xpGain = 0;
                                    if (minutes > 0) {
                                        xpGain = minutes * (Math.floor(Math.random() * 5) + 3); // 3–7 XP за минуту, только если >0 минут
                                    }

                                    currentXp += xpGain;

                                    while (currentXp >= xpToNext) {
                                        currentXp -= xpToNext;
                                        currentLevel++;
                                        xpToNext = calculateXpToNext(currentLevel + 1);
                                    }
                                }
                            }

                            // Обновляем БД (время всегда, XP если был)
                            await db.query(
                                'UPDATE users SET xp = ?, level = ?, xp_to_next = ?, voice_time = ? WHERE user_id = ? AND guild_id = ?',
                                [currentXp, currentLevel, xpToNext, currentTime, userId, guildId]
                            );

                        }
                        tracker.startTime = null;
                    }
                }

                // Смена канала — завершаем старый и стартуем новый
                if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
                    // Завершаем старый
                    await this.execute(oldState, oldState, client);
                    // Стартуем новый
                    await this.execute(oldState, newState, client);
                }
            } catch (error) {
                console.error('Ошибка в voiceStateUpdate:', error);
            }
        })();
    },
};

function calculateXpToNext(nextLevel) {
    return nextLevel * nextLevel * 100 + 200;
}