import dotenv from 'dotenv';
dotenv.config();

import nodeTelegramBotApi from 'node-telegram-bot-api';

const token = process.env.BOT_TOKEN;
const webAppUrl = process.env.WEB_APP_URL || 'http://learnstuff.uz';
const apiBase = process.env.API_BASE || 'http://localhost:8080';
const botSecret = process.env.BOT_INTERNAL_SECRET || '';
const isHttps = webAppUrl.startsWith('https://');

const bot = new nodeTelegramBotApi(token, { polling: true });

bot.onText(/\/start/, async (msg) => {
  const openButton = isHttps
    ? { text: "📚 O'rganishni boshlash", web_app: { url: webAppUrl } }
    : { text: "📚 O'rganishni boshlash (link)", url: webAppUrl };

  await bot.sendMessage(msg.chat.id, 'LernStuff loyihasiga hush kelibsiz !', {
    reply_markup: {
      inline_keyboard: [[openButton]],
      resize_keyboard: true,
    },
  });

  await bot.sendMessage(
    msg.chat.id,
    'Admin panel uchun telefon raqamingizni ulashing:',
    {
      reply_markup: {
        keyboard: [
          [{ text: '📱 Telefon raqamni ulashish', request_contact: true }],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    },
  );
});

bot.on('contact', async (msg) => {
  const contact = msg.contact;
  if (!contact || String(contact.user_id) !== String(msg.from.id)) {
    await bot.sendMessage(
      msg.chat.id,
      '⚠️ Faqat o\'zingizning raqamingizni ulashing.',
    );
    return;
  }

  const phone = contact.phone_number.startsWith('+')
    ? contact.phone_number
    : `+${contact.phone_number}`;

  try {
    const res = await fetch(`${apiBase}/bot-link/admin-register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bot-secret': botSecret,
      },
      body: JSON.stringify({
        tgId: String(msg.from.id),
        phone,
        name: [msg.from.first_name, msg.from.last_name]
          .filter(Boolean)
          .join(' ') || undefined,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      let detail = text;
      try {
        detail = JSON.parse(text).message || text;
      } catch {}
      await bot.sendMessage(
        msg.chat.id,
        `❌ Ro'yxatga olib bo'lmadi: ${detail}`,
        { reply_markup: { remove_keyboard: true } },
      );
      return;
    }

    const data = await res.json();
    const note =
      data.role === 'PENDING'
        ? "\n\n⏳ Super admin tasdiqlashini kuting."
        : data.role === 'SUPER_ADMIN'
          ? "\n\n👑 Siz super adminsiz."
          : "\n\n✅ Admin panel'ga kira olasiz.";
    await bot.sendMessage(
      msg.chat.id,
      `✅ Telefon raqamingiz qabul qilindi (${phone}).\nRole: <b>${data.role}</b>${note}`,
      {
        parse_mode: 'HTML',
        reply_markup: { remove_keyboard: true },
      },
    );
  } catch (err) {
    console.error('bot-link error', err);
    await bot.sendMessage(
      msg.chat.id,
      '❌ Serverga ulanib bo\'lmadi. Keyinroq urinib ko\'ring.',
      { reply_markup: { remove_keyboard: true } },
    );
  }
});

console.log('Telegram bot is running...');
