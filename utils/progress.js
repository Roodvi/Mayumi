function format(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);
  const pad = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function bar(current, total, size = 20) {
  if (!total) return "▱".repeat(size);
  const percent = Math.min(current / total, 1);
  const filled = Math.round(size * percent);
  return "▰".repeat(filled) + "▱".repeat(size - filled);
}

module.exports = { format, bar };
