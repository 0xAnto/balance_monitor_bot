import cron from 'node-cron';
import { Telegraf } from 'telegraf';
import { getAllMonitors, Monitor } from './db';
import { getBalance } from './aptos';

export const initScheduler = (bot: Telegraf) => {
    // Schedule task to run every hour
    cron.schedule('0 * * * *', async () => {
        console.log('Running scheduled balance check...');

        try {
            const monitors = await getAllMonitors();
            if (monitors.length === 0) {
                console.log('No monitors found.');
                return;
            }

            // Group monitors by address to minimize API calls
            const addressMap = new Map<string, Monitor[]>();
            for (const monitor of monitors) {
                if (!addressMap.has(monitor.address)) {
                    addressMap.set(monitor.address, []);
                }
                addressMap.get(monitor.address)?.push(monitor);
            }

            for (const [address, monitorList] of addressMap.entries()) {
                try {
                    const balance = await getBalance(address);

                    for (const monitor of monitorList) {
                        if (balance < monitor.threshold) {
                            const message = `⚠️ *Low Balance Alert* ⚠️\n\n` +
                                `Address: \`${address}\`\n` +
                                `Current Balance: ${balance} APT\n` +
                                `Threshold: ${monitor.threshold} APT\n\n` +
                                `Please top up your wallet!`;

                            try {
                                await bot.telegram.sendMessage(monitor.chat_id, message, { parse_mode: 'Markdown' });
                            } catch (err) {
                                console.error(`Failed to send alert to ${monitor.chat_id}:`, err);
                            }
                        }
                    }
                } catch (error) {
                    console.error(`Failed to check balance for ${address}:`, error);
                }
            }
        } catch (error) {
            console.error('Failed to fetch monitors for scheduler:', error);
        }
    });

    console.log('Scheduler initialized: Checks every hour.');
};
