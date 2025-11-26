import { Telegraf, Context } from 'telegraf';
import { addMonitor, removeMonitor, getMonitorsForChat } from './db';
import { isValidAddress, getBalance } from './aptos';

export const initBot = (token: string) => {
    const bot = new Telegraf(token);

    bot.command('start', (ctx) => {
        ctx.reply(
            'Welcome to the Aptos Balance Monitor Bot! 🤖\n\n' +
            'Commands:\n' +
            '/monitor <address> [threshold] - Monitor an address (default threshold: 10 APT)\n' +
            '/list - List all monitored addresses\n' +
            '/delete <address> - Stop monitoring an address'
        );
    });

    bot.command('monitor', async (ctx) => {
        const args = ctx.message.text.split(' ').slice(1);
        if (args.length < 1) {
            return ctx.reply('Usage: /monitor <address> [threshold]');
        }

        const address = args[0];
        const threshold = args[1] ? parseFloat(args[1]) : 10;

        if (!isValidAddress(address)) {
            return ctx.reply('❌ Invalid Aptos address.');
        }

        if (isNaN(threshold)) {
            return ctx.reply('❌ Threshold must be a number.');
        }

        try {
            await addMonitor(ctx.chat.id.toString(), address, threshold);
            ctx.reply(`✅ Monitoring started for:\n${address}\nThreshold: ${threshold} APT`);
        } catch (error: any) {
            if (error.code === '23505') { // Postgres unique constraint violation code
                ctx.reply('⚠️ You are already monitoring this address.');
            } else {
                console.error(error);
                ctx.reply('❌ Failed to add monitor. Please try again.');
            }
        }
    });

    bot.command('list', async (ctx) => {
        try {
            const monitors = await getMonitorsForChat(ctx.chat.id.toString());
            if (monitors.length === 0) {
                return ctx.reply('You are not monitoring any addresses.');
            }

            const message = monitors.map((m, i) =>
                `${i + 1}. \`${m.address}\`\n   Threshold: ${m.threshold} APT`
            ).join('\n\n');

            ctx.replyWithMarkdown(message);
        } catch (error) {
            console.error(error);
            ctx.reply('❌ Failed to fetch list.');
        }
    });

    bot.command('delete', async (ctx) => {
        const args = ctx.message.text.split(' ').slice(1);
        if (args.length < 1) {
            return ctx.reply('Usage: /delete <address>');
        }

        const address = args[0];
        try {
            await removeMonitor(ctx.chat.id.toString(), address);
            ctx.reply(`🗑️ Stopped monitoring: ${address}`);
        } catch (error) {
            console.error(error);
            ctx.reply('❌ Failed to delete monitor.');
        }
    });

    return bot;
};
