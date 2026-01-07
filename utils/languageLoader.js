const config = require('../config.json');
const path = require('path');
const fs = require('fs');

const languageCache = new Map();

function getGlobalDefaultLanguage() {
    return config.language || 'en';
}

const langCode = getGlobalDefaultLanguage();

async function loadLanguageFile(langCode) {
    if (languageCache.has(langCode)) {
        return languageCache.get(langCode);
    }

    try {
        const langPath = path.join(__dirname, '../languages', `${langCode}.js`);
        if (!fs.existsSync(langPath)) {
            const globalDefault = getGlobalDefaultLanguage();
            console.warn(`[ LANGUAGE ] Language file not found: ${langCode}.js, falling back to ${globalDefault}`);
            return loadLanguageFile(globalDefault);
        }

        const langModule = require(langPath);
        const langData = typeof langModule === 'function' ? langModule() : langModule;

        languageCache.set(langCode, langData);
        return langData;
    } catch (error) {
        console.error(`[ LANGUAGE ] Error loading language file ${langCode}:`, error);
        const globalDefault = getGlobalDefaultLanguage();
        if (langCode !== globalDefault) {
            return loadLanguageFile(globalDefault);
        }
        return {};
    }
}

async function getGuildLanguage(guildId) {
    const globalDefault = getGlobalDefaultLanguage();

    if (!guildId) {
        console.log(`[ LANGUAGE ] No guildId provided, using global default: ${globalDefault}`);
        return globalDefault;
    }
}

function getAvailableLanguages() {
    const languagesDir = path.join(__dirname, '../languages');
    const languages = [];

    try {
        const files = fs.readdirSync(languagesDir);
        for (const file of files) {
            if (file.endsWith('.js')) {
                const langCode = file.replace('.js', '');
                try {
                    const langPath = path.join(languagesDir, file);
                    const langModule = require(langPath);
                    const langData = typeof langModule === 'function' ? langModule() : langModule;
                    const langName = langData.meta?.name || langCode.toUpperCase();
                    languages.push({ code: langCode, name: langName, file: file });
                } catch (e) {
                    console.warn(`[ LANGUAGE ] Failed to load language file ${file}:`, e.message);
                }
            }
        }
    } catch (error) {
        console.error(`[ LANGUAGE ] Error reading languages directory:`, error);
    }

    return languages;
}

async function getLang(guildId) {
    const langCode = await getGuildLanguage(guildId);
    const lang = await loadLanguageFile(langCode);
    if (!lang || Object.keys(lang).length === 0) {
        console.warn(`[ LANGUAGE ] Loaded language file for ${langCode} is empty, falling back to default`);
        const defaultCode = getGlobalDefaultLanguage();
        if (defaultCode !== langCode) {
            return await loadLanguageFile(defaultCode);
        }
    }
    return lang;
}

function getLangSync() {
    const langCode = getGlobalDefaultLanguage();
    if (languageCache.has(langCode)) {
        const cached = languageCache.get(langCode);
        if (cached && typeof cached === 'object') {
            return cached;
        }
    }
    try {
        const langPath = path.join(__dirname, '../languages', `${langCode}.js`);
        if (fs.existsSync(langPath)) {
            delete require.cache[require.resolve(langPath)];
            const langModule = require(langPath);
            const langData = typeof langModule === 'function' ? langModule() : langModule;
            if (langData && typeof langData === 'object') {
                languageCache.set(langCode, langData);
                return langData;
            }
        }
        const fallbackPath = path.join(__dirname, '../languages', 'en.js');
        if (fs.existsSync(fallbackPath) && langCode !== 'en') {
            console.warn(`[ LANGUAGE ] Language file ${langCode}.js not found or invalid, falling back to en.js`);
            delete require.cache[require.resolve(fallbackPath)];
            const fallbackModule = require(fallbackPath);
            const fallbackData = typeof fallbackModule === 'function' ? fallbackModule() : fallbackModule;
            if (fallbackData && typeof fallbackData === 'object') {
                languageCache.set('en', fallbackData);
                return fallbackData;
            }
        }
    } catch (error) {
        console.error(`[ LANGUAGE ] Error loading language file ${langCode}:`, error);
        if (langCode !== 'en') {
            try {
                const fallbackPath = path.join(__dirname, '../languages', 'en.js');
                if (fs.existsSync(fallbackPath)) {
                    delete require.cache[require.resolve(fallbackPath)];
                    const fallbackModule = require(fallbackPath);
                    const fallbackData = typeof fallbackModule === 'function' ? fallbackModule() : fallbackModule;
                    if (fallbackData && typeof fallbackData === 'object') {
                        languageCache.set('en', fallbackData);
                        return fallbackData;
                    }
                }
            } catch (fallbackError) {
                console.error(`[ LANGUAGE ] Error loading fallback language file en.js:`, fallbackError);
            }
        }
    }
    return { console: {} };
}

function clearLanguageCache() {
    languageCache.clear();
}

module.exports = {
    getLang,
    getLangSync,
    getGuildLanguage,
    loadLanguageFile,
    clearLanguageCache,
    getAvailableLanguages,
    getGlobalDefaultLanguage
};

