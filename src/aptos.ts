import { Aptos, AptosConfig, Network, AccountAddress } from "@aptos-labs/ts-sdk";
import dotenv from 'dotenv';

dotenv.config();

// Default to MAINNET if not specified or invalid
const networkStr = process.env.APTOS_NETWORK?.toUpperCase();
const network = Network[networkStr as keyof typeof Network] || Network.MAINNET;

const config = new AptosConfig({ network });
const aptos = new Aptos(config);

export const getBalance = async (address: string): Promise<number> => {
    try {
        const amount = await aptos.getAccountCoinAmount({
            accountAddress: address,
            coinType: "0x1::aptos_coin::AptosCoin",
        });
        // Convert Octas to APT (1 APT = 10^8 Octas)
        return amount / 100_000_000;
    } catch (error) {
        console.error(`Error fetching balance for ${address}:`, error);
        throw error; // Let the caller handle the error (e.g., invalid address or network issue)
    }
};

export const isValidAddress = (address: string): boolean => {
    try {
        return AccountAddress.isValid({ input: address }).valid;
    } catch (error) {
        return false;
    }
};
