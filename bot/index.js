import dotenv from 'dotenv';
dotenv.config();
 
import nodeTelegramBotApi from 'node-telegram-bot-api';


const token = process.env.BOT_TOKEN;
const webAppUrl = process.env.WEB_APP_URL || 'https://learnstuff.uz';
const bot = new nodeTelegramBotApi(token, { polling: true });

bot.onText(/\/start/, async (msg) => {
  await bot.sendMessage(msg.chat.id, 'LernStuff loyihasiga hush kelibsiz !', {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "📚 O'rganishni boshlash",
            web_app: { url: webAppUrl },
          },
        ],
      ],
    },
  });
});

console.log('Telegram bot is running...');