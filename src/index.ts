import dotenv from 'dotenv';
import { initBot } from './bot';
import { initScheduler } from './scheduler';

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN || BOT_TOKEN === 'PLACEHOLDER') {
    console.error('❌ BOT_TOKEN is missing or invalid in .env file.');
    process.exit(1);
}

const bot = initBot(BOT_TOKEN);
initScheduler(bot);

bot.launch(() => {
    console.log('🚀 Bot is running!');
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
