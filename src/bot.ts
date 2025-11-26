import { Telegraf, Context, Markup } from 'telegraf';
import { addMonitor, removeMonitor, getMonitorsForChat, isUserAuthorized, redeemApiKey } from './db';
import { isValidAddress, getBalance } from './aptos';

const SUPPORTED_CHAINS = ['aptos'];

export const initBot = (token: string) => {
    const bot = new Telegraf(token);

    bot.use(async (ctx, next) => {
        if (!ctx.chat) return next();

        const chatId = ctx.chat.id.toString();
        const isAuthorized = await isUserAuthorized(chatId);

        if (isAuthorized) {
            return next();
        }

        // Check if user is trying to redeem a key
        if (ctx.message && 'text' in ctx.message) {
            const text = ctx.message.text.trim();
            // Simple heuristic: keys are likely not commands (unless they start with / which is unlikely for a key)
            // But let's just try to redeem anything that's not a command if they are unauthorized.
            // Actually, let's just try to redeem whatever they send if they are not authorized.

            if (await redeemApiKey(text, chatId)) {
                await ctx.reply('🎉 Access granted! You can now use the bot.');
                return next();
            }
        }

        // If we are here, user is not authorized and didn't provide a valid key
        await ctx.reply('🔒 Access restricted. Please provide a valid API key to use this bot.\nContact the admin to get a key.');
    });

    bot.command('start', async (ctx) => {
        // The middleware handles the auth check. If we get here, we are authorized (or just became authorized).
        // However, if the user JUST redeemed a key, the middleware called next(), so we fall through to here.
        // But if they were already authorized, we also get here.

        ctx.reply(
            'Welcome to the Aptos Balance Monitor Bot! 🤖\n\n' +
            'Commands:\n' +
            '/monitor [chain] <address> [threshold] - Monitor an address (default chain: aptos, threshold: 10 APT)\n' +
            '/list - List all monitored addresses\n' +
            '/delete [chain] <address> - Stop monitoring an address',
            Markup.keyboard([
                ['📋 List', '❓ Help']
            ]).resize()
        );
    });

    // Register commands for the main menu
    bot.telegram.setMyCommands([
        { command: 'monitor', description: 'Monitor an address' },
        { command: 'list', description: 'List monitored addresses' },
        { command: 'delete', description: 'Stop monitoring an address' },
        { command: 'start', description: 'Show help and buttons' },
    ]);

    bot.command('monitor', async (ctx) => {
        const args = ctx.message.text.split(' ').slice(1);
        if (args.length < 1) {
            return ctx.reply('Usage: /monitor [chain] <address> [threshold]\n\nExample:\n/monitor 0x1 10\n/monitor aptos 0x1 10');
        }

        // Parse arguments based on whether first arg looks like a chain or address
        let chain = 'aptos';
        let address: string;
        let threshold = 10;

        const arg0 = args[0].toLowerCase();

        // Check if first argument is a valid address (starts with 0x)
        if (arg0.startsWith('0x')) {
            // Format: /monitor <address> [threshold]
            address = arg0;
            threshold = args[1] ? parseFloat(args[1]) : 10;
        } else {
            // Format: /monitor <chain> <address> [threshold]
            chain = arg0;
            if (args.length < 2) {
                return ctx.reply('Usage: /monitor [chain] <address> [threshold]\n\nExample:\n/monitor 0x1 10\n/monitor aptos 0x1 10');
            }
            address = args[1].toLowerCase();
            threshold = args[2] ? parseFloat(args[2]) : 10;
        }

        // Validate chain
        if (!SUPPORTED_CHAINS.includes(chain)) {
            return ctx.reply(`❌ Unsupported chain. Currently only '${SUPPORTED_CHAINS.join(', ')}' is supported.`);
        }

        if (!isValidAddress(address)) {
            return ctx.reply('❌ Invalid Aptos address.');
        }

        if (isNaN(threshold)) {
            return ctx.reply('❌ Threshold must be a number.');
        }

        try {
            await addMonitor(ctx.chat.id.toString(), address, threshold, chain, null);
            ctx.reply(`✅ Monitoring started for:\nChain: ${chain}\nAddress: ${address}\nThreshold: ${threshold} APT`);
        } catch (error: any) {
            if (error.code === '23505') { // Postgres unique constraint violation code
                ctx.reply('⚠️ You are already monitoring this address on this chain.');
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
                `${i + 1}. Chain: ${m.chain}\n   Address: \`${m.address}\`\n   Threshold: ${m.threshold} APT`
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
            return ctx.reply('Usage: /delete [chain] <address>\n\nExample:\n/delete 0x1\n/delete aptos 0x1');
        }

        // Parse arguments similar to monitor command
        let chain = 'aptos';
        let address: string;

        const arg0 = args[0].toLowerCase();

        if (arg0.startsWith('0x')) {
            // Format: /delete <address>
            address = arg0;
        } else {
            // Format: /delete <chain> <address>
            chain = arg0;
            if (args.length < 2) {
                return ctx.reply('Usage: /delete [chain] <address>\n\nExample:\n/delete 0x1\n/delete aptos 0x1');
            }
            address = args[1].toLowerCase();
        }

        try {
            await removeMonitor(ctx.chat.id.toString(), address, chain, null);
            ctx.reply(`🗑️ Stopped monitoring: ${address} on ${chain}`);
        } catch (error) {
            console.error(error);
            ctx.reply('❌ Failed to delete monitor.');
        }
    });

    // Button Handlers
    bot.hears('📋 List', async (ctx) => {
        // Reuse list logic
        try {
            const monitors = await getMonitorsForChat(ctx.chat.id.toString());
            if (monitors.length === 0) {
                return ctx.reply('You are not monitoring any addresses.');
            }

            const message = monitors.map((m, i) =>
                `${i + 1}. Chain: ${m.chain}\n   Address: \`${m.address}\`\n   Threshold: ${m.threshold} APT`
            ).join('\n\n');

            ctx.replyWithMarkdown(message);
        } catch (error) {
            console.error(error);
            ctx.reply('❌ Failed to fetch list.');
        }
    });

    bot.hears('❓ Help', (ctx) => {
        ctx.reply(
            'Welcome to the Aptos Balance Monitor Bot! 🤖\n\n' +
            'Commands:\n' +
            '/monitor [chain] <address> [threshold] - Monitor an address (default chain: aptos, threshold: 10 APT)\n' +
            '/list - List all monitored addresses\n' +
            '/delete [chain] <address> - Stop monitoring an address'
        );
    });

    // Fallback handler for invalid commands/messages
    bot.on('message', (ctx) => {
        ctx.reply(
            'Welcome to the Aptos Balance Monitor Bot! 🤖\n\n' +
            'Commands:\n' +
            '/monitor [chain] <address> [threshold] - Monitor an address (default chain: aptos, threshold: 10 APT)\n' +
            '/list - List all monitored addresses\n' +
            '/delete [chain] <address> - Stop monitoring an address'
        );
    });

    return bot;
};
