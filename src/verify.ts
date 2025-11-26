import { addMonitor, removeMonitor, getMonitorsForChat, getAllMonitors } from './db';
import { getBalance, isValidAddress } from './aptos';

const TEST_CHAT_ID = '123456789';
const TEST_ADDRESS = '0xc739507214d0e1bf9795485299d709e00024e92f7c0d055a4c2c39717882bdfd'; // Aptos Foundation Wallet

async function runVerification() {
    console.log('🔍 Starting Verification...\n');

    // 1. Test Database
    console.log('--- Database Tests (Supabase) ---');
    try {
        console.log('Adding monitor...');
        await addMonitor(TEST_CHAT_ID, TEST_ADDRESS, 100);

        const monitors = await getMonitorsForChat(TEST_CHAT_ID);
        console.log(`Monitors for chat ${TEST_CHAT_ID}:`, monitors);

        if (monitors.length > 0 && monitors[0].address === TEST_ADDRESS) {
            console.log('✅ Monitor added successfully.');
        } else {
            console.error('❌ Failed to add monitor.');
        }

        const allMonitors = await getAllMonitors();
        if (allMonitors.length > 0) {
            console.log('✅ getAllMonitors works.');
        } else {
            console.error('❌ getAllMonitors failed.');
        }

        console.log('Removing monitor...');
        await removeMonitor(TEST_CHAT_ID, TEST_ADDRESS);
        const monitorsAfterRemove = await getMonitorsForChat(TEST_CHAT_ID);
        if (monitorsAfterRemove.length === 0) {
            console.log('✅ Monitor removed successfully.');
        } else {
            console.error('❌ Failed to remove monitor.');
        }
    } catch (error) {
        console.error('❌ Database test failed:', error);
        console.log('⚠️ Make sure you have set SUPABASE_URL and SUPABASE_KEY in .env and run the SQL setup.');
    }
    console.log('\n');

    // 2. Test Aptos Integration
    console.log('--- Aptos Integration Tests ---');
    console.log(`Checking validity of ${TEST_ADDRESS}...`);
    if (isValidAddress(TEST_ADDRESS)) {
        console.log('✅ Address is valid.');
    } else {
        console.error('❌ Address validation failed.');
    }

    console.log(`Fetching balance for ${TEST_ADDRESS}...`);
    try {
        const balance = await getBalance(TEST_ADDRESS);
        console.log(`✅ Balance fetched: ${balance} APT`);
    } catch (error) {
        console.error('❌ Failed to fetch balance:', error);
    }
    console.log('\n');

    console.log('🎉 Verification Complete.');
}

runVerification().catch(console.error);
