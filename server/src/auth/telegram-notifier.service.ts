import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TelegramNotifierService {
  private readonly logger = new Logger(TelegramNotifierService.name);

  async sendMessage(chatId: string | number, text: string): Promise<boolean> {
    const token = process.env.BOT_TOKEN;
    if (!token) {
      this.logger.warn(
        `BOT_TOKEN not set — would send to ${chatId}: ${text}`,
      );
      return false;
    }

    try {
      const res = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
          }),
        },
      );
      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`Telegram sendMessage failed: ${res.status} ${body}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.error('Telegram sendMessage error', err);
      return false;
    }
  }
}
