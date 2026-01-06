const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const db = require('../../db.js');

module.exports = {
    category: 'tops',
    data: new SlashCommandBuilder()
        .setName('top')
        .setDescription('Показывает топ-5 пользователей сервера')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Тип топа')
                .setRequired(true)
                .addChoices(
                    { name: 'Сообщения', value: 'messages' },
                    { name: 'Войс', value: 'voice' },
                    { name: 'Уровень', value: 'level' },
                    { name: 'Баланс', value: 'balance' }
                )),
    async execute(interaction) {
        const [prefRows] = await db.query(
            'SELECT prefer_ephemeral FROM mods WHERE user_id = ?',
            [interaction.user.id]
        );

        const preferEphemeral = prefRows.length > 0 ? prefRows[0].prefer_ephemeral : false; // По умолчанию скрытый

        // Опция для разового переопределения (опционально добавь в data)
        const optionEphemeral = interaction.options.getBoolean('ephemeral'); // null если нет опции
        const isEphemeral = optionEphemeral !== null ? optionEphemeral : preferEphemeral;
        await interaction.reply({ content: 'Загрузка...', fetchReply: true, ephemeral: isEphemeral });
        const type = interaction.options.getString('type');
        const guildId = interaction.guild.id;
        let field, title;
        switch (type) {
            case 'messages':
                field = 'messages_count';
                title = '***Топ-5 пользователей по сообщениям:***';
                break;
            case 'voice':
                field = 'voice_time';
                title = '***Топ-5 пользователей по времени в войсе:***';
                break;
            case 'level':
                field = 'level';
                title = '***Топ-5 пользователей по уровню:***';
                break;
            case 'balance':
                field = 'balance';
                title = '***Топ-5 пользователей по балансу:***';
                break;
        }
        const [rows] = await db.query(
            `SELECT CAST(user_id AS CHAR) AS user_id, ${field} AS value FROM users WHERE guild_id = ? ORDER BY ${field} DESC LIMIT 5`,
            [guildId]
        );
        if (rows.length === 0) {
            return await interaction.editReply('На сервере ещё нет активности для этого топа!');
        }
        const canvas = createCanvas(1000, 549);
        const ctx = canvas.getContext('2d');
        // Первый фон
        let backgroundOne;
        try {
            backgroundOne = await loadImage('./assets/background.jpg');
        } catch (err) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        if (backgroundOne) ctx.drawImage(backgroundOne, 0, 0, canvas.width, canvas.height);
        // Второй фон (оверлей)
        let backgroundTwo;
        try {
            backgroundTwo = await loadImage('./assets/top.png');
        } catch (err) { }
        if (backgroundTwo) ctx.drawImage(backgroundTwo, 0, 0, canvas.width, canvas.height);
        // Заголовок
        ctx.font = 'bold 50px Sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';

        const defaultAvatarURL = 'https://cdn.discordapp.com/embed/avatars/0.png';
        const avatarSize = 180;
        // Y-центр для всех аватарок

        // Массив позиций — ничего не менял, только добавил отдельную настройку ниже
        let positions = [
            // #1
            { centerX: 101, centerY: 275, drawName: true, nameX: 38, nameY: 170, drawValue: true, valueX: 79, valueY: 410 },
            // #2
            { centerX: 297, centerY: 275, drawName: true, nameX: 235, nameY: 170, drawValue: true, valueX: 441, valueY: 410 },
            // #3
            { centerX: 492, centerY: 275, drawName: true, nameX: 432, nameY: 170, drawValue: true, valueX: 471, valueY: 410 },
            // #4
            { centerX: 688, centerY: 278, drawName: true, nameX: 628, nameY: 170, drawValue: true, valueX: 668, valueY: 410 },
            // #5
            { centerX: 884, centerY: 275, drawName: true, nameX: 824, nameY: 170, drawValue: true, valueX: 865, valueY: 410 }
        ];


        // Отдельная настройка только для voice — перемещаем значение #1 под аватарку (по центру под #1)
        if (type === 'voice') {
            positions[0].valueX = positions[0].centerX;     // центр под аватаркой #1
            positions[0].valueY = positions[0].centerY + avatarSize / 2 + 50; // ниже аватарки (подправь число, если нужно выше/ниже)
            // Если нужно изменить выравнивание (center/left/right)
            // ctx.textAlign будет 'center' в этом случае — см. ниже
        }

        // Отрисовка каждого места отдельно
        for (let i = 0; i < positions.length; i++) {
            if (i >= rows.length) continue;

            const pos = positions[i];
            const rank = i + 1;
            const row = rows[i];
            const userId = row.user_id;

            let username = 'Неизвестно';
            let valueText = row.value.toString();
            if (type === 'voice') {
                const hours = Math.floor(row.value / 3600);
                const minutes = Math.floor((row.value % 3600) / 60);
                const seconds = row.value % 60;
                valueText = `${hours}ч ${minutes}м ${seconds}с`;
            } else if (type === 'balance') {
                valueText += '$';
            }

            let avatarURL = defaultAvatarURL;
            try {
                const member = await interaction.guild.members.fetch(userId);
                username = member.user.username.charAt(0).toUpperCase() + member.user.username.slice(1) ?? 'Неизвестно';
                avatarURL = member.user.displayAvatarURL({ format: 'png', size: 256 }) ?? defaultAvatarURL;
            } catch {
                try {
                    const user = await interaction.client.users.fetch(userId);
                    username = user.username.charAt(0).toUpperCase() + user.username.slice(1) ?? 'Неизвестно';
                    avatarURL = user.displayAvatarURL({ format: 'png', size: 256 }) ?? defaultAvatarURL;
                } catch { }
            }
            avatarURL = avatarURL.replace(/\.(gif|webp)(\?size=\d+)?$/i, '.png$2');

            let avatar;
            try {
                avatar = await loadImage(avatarURL);
            } catch {
                avatar = await loadImage(defaultAvatarURL);
            }

            const x = pos.centerX - avatarSize / 2;
            const y = pos.centerY - avatarSize / 2;

            // Аватарка
            ctx.save();
            ctx.beginPath();
            ctx.arc(pos.centerX, pos.centerY, avatarSize / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, x, y, avatarSize, avatarSize);
            ctx.restore();

            // Имя
            if (pos.drawName) {
                ctx.font = '40px Sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(username, pos.nameX, pos.nameY);
            }

            // Значение — для voice используем center, для остальных как было
            if (pos.drawValue) {
                ctx.font = '35px Sans-serif';
                ctx.textAlign = (type === 'voice' && rank === 1) ? 'center' : 'left'; // для voice #1 — по центру
                ctx.fillText(valueText, pos.valueX, pos.valueY);
            }
        }

        const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'top.png' });
        await interaction.editReply({ content: title, files: [attachment], fetchReply: true, ephemeral: isEphemeral });
    },
};