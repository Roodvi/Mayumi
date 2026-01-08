const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");


const FEEDBACK_PLACEHOLDERS = {
    bug: {
        subject: "Например: /play не запускает музыку",
        details:
            "Шаги:\n1) Написал /play\n2) Выбрал трек\n\nОжидал:\nМузыка играет\n\nФактически:\nБот ничего не сделал",
    },

    question: {
        subject: "Например: Как работает autoplay?",
        details:
            "Опиши, что именно тебе непонятно.\n\nНапример:\n— Как включить autoplay?\n— Почему бот выходит из канала?",
    },

    suggestion: {
        subject: "Например: Добавить фильтр bassboost",
        details:
            "Опиши идею:\n— Что добавить?\n— Как это должно работать?\n— Почему это будет полезно?",
    },

    dislike: {
        subject: "Например: Не нравится система кнопок",
        details:
            "Опиши, что именно не нравится:\n— Команды\n— Интерфейс\n— Поведение бота\n\nИ почему.",
    },

    like: {
        subject: "Например: Очень удобный /play",
        details:
            "Расскажи, что именно понравилось:\n— Музыка\n— Интерфейс\n— Скорость\n— Функции",
    },
};
// Категории “как на старом боте”
const CATEGORY_OPTIONS = [
    { label: "Информация", value: "info", emoji: "ℹ️", description: "Узнать" },
    { label: "Экономика", value: "economy", emoji: "🎮", description: "Денюжки..." },
    { label: "Фан команды", value: "fun", emoji: "🧁", description: "Устройте веселье на сервере" },
    { label: "Музыка", value: "music", emoji: "🎵", description: "Устройте уютную атмосферу или же дискач :)" },
    { label: "Модерация", value: "moderation", emoji: "🛡️", description: "Преступление и наказание" },
];

const FEEDBACK_OPTIONS = [
    { label: "Я нашел ошибку", value: "bug", emoji: "⚠️", description: "Расскажите нам об ошибках в боте" },
    { label: "У меня есть вопрос", value: "question", emoji: "❓", description: "С радостью ответим на ваш вопрос" },
    { label: "У меня есть предложение", value: "suggestion", emoji: "💡", description: "Мы готовы добавить в бота то, что вы попросите" },
    { label: "Мне не нравится бот", value: "dislike", emoji: "👎", description: "Расскажите нам о том, что вам не нравится" },
    { label: "Мне нравится бот", value: "like", emoji: "👍", description: "Расскажите нам о том, что вам нравится в боте" },
];

// Примерная “умная” раскладка команд по категориям (покажем только то, что реально есть у тебя)
const CATEGORY_KEYWORDS = {
    music: new Set(["play", "pause", "resume", "skip", "stop", "queue", "nowplaying", "volume", "shuffle", "loop", "autoplay"]),
    info: new Set(["help", "ping", "info", "botinfo", "about"]),
    moderation: new Set(["ban", "kick", "mute", "timeout", "warn", "unwarn", "clear", "purge", "unmute"]),
    economy: new Set(["balance", "bal", "money", "work", "daily", "pay", "shop", "buy", "sell"]),
    fun: new Set(["meme", "joke", "fun", "8ball", "say", "gif"]),
};

const clampPlaceholder = (s) => {
    const text = String(s || "");
    return text.length > 100 ? text.slice(0, 97) + "..." : text;
};

function collectCommandsByCategory(client, categoryValue) {
    const cmds = [...client.commands.values()]
        .filter((c) => c?.data?.name && c?.data?.description)
        .map((c) => ({ name: c.data.name, description: c.data.description }));

    const set = CATEGORY_KEYWORDS[categoryValue];
    if (!set) return [];

    // Берём только известные для категории и реально существующие
    const filtered = cmds.filter((c) => set.has(c.name));
    // Если не нашли — просто покажем “нет команд”
    return filtered;
}

function makeMainEmbed(interaction) {
    return new EmbedBuilder()
        .setTitle("Меню")
        .setColor(0x9b59b6)
        .setDescription(
            [,
                `Полный список команд вы можете узнать на нашем сайте: **ТЫК**`,
                "",
                `Запрос от: **${interaction.user.username}** • ${new Date().toLocaleString("ru-RU")}`,
            ].join("\n")
        );
}

function makeCategoryEmbed(interaction, categoryValue) {
    const opt = CATEGORY_OPTIONS.find((o) => o.value === categoryValue);
    const list = collectCommandsByCategory(interaction.client, categoryValue);

    const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle(`${opt?.emoji ?? "📁"} ${opt?.label ?? "Команды"}`);

    if (!list.length) {
        embed.setDescription("Команды этой категории пока не настроены/не найдены в боте.");
        return embed;
    }

    embed.setDescription(
        list
            .map((c) => `• \`/${c.name}\` — ${c.description}`)
            .join("\n")
    );

    return embed;
}

function makeSelectRows(selectedCategory = "info") {
    const categoryMenu = new StringSelectMenuBuilder()
        .setCustomId("help_category")
        .setPlaceholder("Команды")
        .addOptions(
            CATEGORY_OPTIONS.map((o) => ({
                label: o.label,
                value: o.value,
                description: o.description,
                emoji: o.emoji,
                default: o.value === selectedCategory,
            }))
        );

    const feedbackMenu = new StringSelectMenuBuilder()
        .setCustomId("help_feedback")
        .setPlaceholder("Обратная связь")
        .addOptions(
            FEEDBACK_OPTIONS.map((o) => ({
                label: o.label,
                value: o.value,
                description: o.description,
                emoji: o.emoji,
            }))
        );

    return [
        new ActionRowBuilder().addComponents(categoryMenu),
        new ActionRowBuilder().addComponents(feedbackMenu),
    ];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Меню помощи по командам и обратной связи"),

    async execute(interaction) {
        // Ответим сразу “Меню”
        const msg = await interaction.reply({
            embeds: [makeMainEmbed(interaction)],
            components: makeSelectRows("info"),
            fetchReply: true,
        });

        const collector = msg.createMessageComponentCollector({
            time: 5 * 60_000,
        });

        collector.on("collect", async (i) => {
            // Только автор команды может кликать
            if (i.user.id !== interaction.user.id) {
                return i.reply({
                    content: "❌ Это меню не для тебя 🙂 Запусти `/help`.",
                    flags: MessageFlags.Ephemeral,
                });
            }

            if (i.customId === "help_category") {
                const category = i.values?.[0] ?? "info";
                return i.update({
                    embeds: [makeMainEmbed(interaction), makeCategoryEmbed(interaction, category)],
                    components: makeSelectRows(category),
                });
            }

            if (i.customId === "help_feedback") {
                const choice = i.values?.[0];

                const titleByChoice = {
                    bug: "Я нашел ошибку",
                    question: "У меня есть вопрос",
                    suggestion: "У меня есть предложение",
                    dislike: "Мне не нравится бот",
                    like: "Мне нравится бот",
                };

                const modal = new ModalBuilder()
                    .setCustomId(`help_feedback_modal:${choice}`)
                    .setTitle(titleByChoice[choice] || "Обратная связь");

                const examples = FEEDBACK_PLACEHOLDERS[choice] || {};

                const subject = new TextInputBuilder()
                    .setCustomId("subject")
                    .setLabel("Коротко (тема)")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(100)
                    .setPlaceholder(clampPlaceholder(examples.subject || "Кратко опиши суть"));

                const details = new TextInputBuilder()
                    .setCustomId("details")
                    .setLabel("Подробности")
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
                    .setMaxLength(1000)
                    .setPlaceholder(clampPlaceholder(examples.details || "Опиши подробнее"));

                modal.addComponents(
                    new ActionRowBuilder().addComponents(subject),
                    new ActionRowBuilder().addComponents(details),
                );

                // открываем модалку
                return i.showModal(modal);
            }
        });

        collector.on("end", async () => {
            // Отключим меню, чтобы не было “This interaction failed”
            try {
                const disabledRows = makeSelectRows("info").map((row) => {
                    row.components.forEach((c) => c.setDisabled(true));
                    return row;
                });

                await msg.edit({ components: disabledRows }).catch(() => { });
            } catch { }
        });
    },
};
