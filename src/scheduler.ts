import cron from 'node-cron';
import { Telegraf } from 'telegraf';
import { getAllMonitors, Monitor, updateLastAlerted } from './db';
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
                        // Check if we already alerted recently (e.g., within the last 50 minutes to be safe for hourly cron)
                        const lastAlerted = monitor.last_alerted_at ? new Date(monitor.last_alerted_at) : null;
                        const now = new Date();
                        const timeSinceLastAlert = lastAlerted ? now.getTime() - lastAlerted.getTime() : Infinity;
                        const ONE_HOUR_MS = 60 * 60 * 1000;
                        const MIN_ALERT_INTERVAL = ONE_HOUR_MS - (10 * 60 * 1000); // 50 minutes

                        if (balance < monitor.threshold && timeSinceLastAlert > MIN_ALERT_INTERVAL) {
                            const message = `⚠️ *Low Balance Alert* ⚠️\n\n` +
                                `Chain: ${monitor.chain}\n` +
                                `Address: \`${address}\`\n` +
                                `Current Balance: ${balance} APT\n` +
                                `Threshold: ${monitor.threshold} APT\n\n` +
                                `Please top up your wallet!`;

                            try {
                                await bot.telegram.sendMessage(monitor.chat_id, message, { parse_mode: 'Markdown' });
                                await updateLastAlerted(monitor.id);
                                console.log(`Alert sent to ${monitor.chat_id} for ${address}`);
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
