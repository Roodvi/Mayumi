const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

function controlsRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("music_pause").setLabel("⏸️").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("music_resume").setLabel("▶️").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("music_skip").setLabel("⏭️").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("music_stop").setLabel("⏹️").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("music_loop").setLabel("🔁").setStyle(ButtonStyle.Secondary),
    );
}

function volumeRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("music_voldown").setLabel("🔉").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("music_volup").setLabel("🔊").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("music_shuffle").setLabel("🔀").setStyle(ButtonStyle.Secondary),
    );
}

module.exports = { controlsRow, volumeRow };
