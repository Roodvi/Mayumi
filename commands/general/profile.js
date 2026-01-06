const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage, registerFont } = require('canvas');
const db = require('../../db.js');
const sharp = require('sharp'); // Для конвертации WebP → PNG

registerFont('./fonts/Zector.ttf', { family: 'Zector' });

module.exports = {
    category: 'profile',
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('Показывает профиль пользователя')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь, чей профиль смотреть (по умолчанию ты)')
                .setRequired(false)),

    async execute(interaction) {
        const target = interaction.options.getUser('user') || interaction.user;
        if (target.bot) {
            return await interaction.reply({ content: 'Боты не имеют профилей! 🤖', ephemeral: true });
        }

        const [prefRows] = await db.query(
            'SELECT prefer_ephemeral FROM mods WHERE user_id = ?',
            [interaction.user.id]
        );

        const preferEphemeral = prefRows.length > 0 ? prefRows[0].prefer_ephemeral : false; // По умолчанию скрытый

        // Опция для разового переопределения (опционально добавь в data)
        const optionEphemeral = interaction.options.getBoolean('ephemeral'); // null если нет опции
        const isEphemeral = optionEphemeral !== null ? optionEphemeral : preferEphemeral;

        await interaction.deferReply({ ephemeral: isEphemeral });

        const user = target;
        const guildId = interaction.guild.id;

        // Получаем данные из БД
        const [rows] = await db.query(
            'SELECT balance, xp, level, voice_time, messages_count FROM users WHERE user_id = ? AND guild_id = ?',
            [user.id, guildId]
        );

        const data = rows[0] || { balance: 0, xp: 0, level: 1, voice_time: 0, messages_count: 0 };

        const member = await interaction.guild.members.fetch(target.id);
        const joinedAt = member.joinedAt.toLocaleDateString('ru-RU');

        const canvas = createCanvas(1032, 630);
        const ctx = canvas.getContext('2d');

        let avatarBuffer;
        try {
            const response = await fetch(user.displayAvatarURL({ size: 512 }));
            avatarBuffer = Buffer.from(await response.arrayBuffer());
        } catch (err) {
            console.log('Ошибка fetch аватарки — fallback');
            avatarBuffer = await fetch('https://cdn.discordapp.com/embed/avatars/0.png').then(r => r.arrayBuffer());
            avatarBuffer = Buffer.from(avatarBuffer);
        }
        let avatarImageBack;
        try {
            // Конвертируем в PNG через sharp
            const pngBuffer = await sharp(avatarBuffer).png().blur(10).modulate({ brightness: 0.6 }).toBuffer();
            avatarImageBack = await loadImage(pngBuffer);
        } catch (err) {
            console.log('Ошибка конвертации аватарки — fallback на default');
            avatarImageBack = await loadImage('https://cdn.discordapp.com/embed/avatars/0.png');
        }


        ctx.drawImage(avatarImageBack, 0, -180, 1032, 630);

        // Фон
        let background;
        try {
            background = await loadImage('./assets/profile.png');
        } catch (err) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            console.log('Фон не найден — чёрный fallback');
        }

        if (background) {
            ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

            // Получаем данные изображения для удаления зелёного
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Удаляем зелёный фон (chroma key)
            const greenThreshold = 100; // Настрой под свой зелёный (чем меньше — строже)
            const greenR = 0;
            const greenG = 255;
            const greenB = 0;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // Расстояние до чистого зелёного
                const distance = Math.sqrt(
                    Math.pow(r - greenR, 2) +
                    Math.pow(g - greenG, 2) +
                    Math.pow(b - greenB, 2)
                );

                if (distance < greenThreshold) {
                    data[i + 3] = 0; // Прозрачность (удаляем пиксель)
                }
            }

            ctx.putImageData(imageData, 0, 0);
        }

        // Аватарка с конвертацией WebP → PNG

        let avatarImage;
        try {
            // Конвертируем в PNG через sharp
            const pngBuffer = await sharp(avatarBuffer).png().toBuffer();
            avatarImage = await loadImage(pngBuffer);
        } catch (err) {
            console.log('Ошибка конвертации аватарки — fallback на default');
            avatarImage = await loadImage('https://cdn.discordapp.com/embed/avatars/0.png');
        }

        const circleX = 176;
        const circleY = 235;
        const radius = 113;

        ctx.save();
        ctx.beginPath();
        ctx.arc(circleX, circleY, radius, 0, Math.PI * 2, false);
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(avatarImage, circleX - radius, circleY - radius, radius * 2, radius * 2);

        ctx.restore();

        let cycle = await loadImage('./assets/cycle.png');
        ctx.drawImage(cycle, 0, 0, canvas.width, canvas.height);

        // Текст с Zector
        ctx.font = 'bold 40px Sans-serif';
        ctx.fillStyle = '#ffffffff';
        const capitalizedName = user.tag.charAt(0).toUpperCase() + user.tag.slice(1);
        ctx.fillText(capitalizedName, 300, 50);

        ctx.font = '30px Zector';
        ctx.fillStyle = '#777778';
        ctx.fillText(`${joinedAt}`, 315, 520);
        ctx.fillText(`${user.createdAt.toLocaleDateString('ru-RU')}`, 315, 596);

        ctx.font = '30px Zector';
        ctx.fillStyle = '#777778';
        const hours = Math.floor(data.voice_time / 3600);
        const minutes = Math.floor((data.voice_time % 3600) / 60);
        const seconds = data.voice_time % 60;
        ctx.fillText(`${hours}Час ${minutes}Мин ${seconds}Сек`, 676, 512);
        ctx.fillText(`${data.messages_count}`, 676, 596);

        ctx.font = '30px Zector';
        ctx.fillStyle = '#777778';
        ctx.fillText(`${data.level}`, 115, 432);
        ctx.fillText(`${data.xp}`, 88, 491);
        ctx.fillText(`${data.balance}`, 192, 550);

        const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'profile.png' });
        await interaction.editReply({ files: [attachment], ephemeral: isEphemeral });
    },
};