import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl === 'PLACEHOLDER') {
    console.error('❌ Supabase credentials missing in .env');
    // We don't exit here to allow the app to run and show the error gracefully,
    // or we could throw. For now, let's just log.
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

export interface Monitor {
    id: number;
    chat_id: string;
    address: string;
    chain: string;
    token_address: string | null;
    threshold: number;
    name?: string;
    created_at: string;
    last_alerted_at?: string | null;
}

export const addMonitor = async (
    chatId: string,
    address: string,
    threshold: number = 10,
    chain: string = 'aptos',
    tokenAddress: string | null = null,
    name?: string
): Promise<void> => {
    const { error } = await supabase
        .from('monitors')
        .insert({ chat_id: chatId, address, threshold, chain, token_address: tokenAddress, name });

    if (error) throw error;
};

export const removeMonitor = async (
    chatId: string,
    address: string,
    chain: string = 'aptos',
    tokenAddress: string | null = null
): Promise<void> => {
    let query = supabase
        .from('monitors')
        .delete()
        .eq('chat_id', chatId)
        .eq('address', address)
        .eq('chain', chain);

    if (tokenAddress) {
        query = query.eq('token_address', tokenAddress);
    } else {
        query = query.is('token_address', null);
    }

    const { error } = await query;

    if (error) throw error;
};

export const getMonitorsForChat = async (chatId: string): Promise<Monitor[]> => {
    const { data, error } = await supabase
        .from('monitors')
        .select('*')
        .eq('chat_id', chatId);

    if (error) throw error;
    return data as Monitor[];
};

export const getAllMonitors = async (): Promise<Monitor[]> => {
    const { data, error } = await supabase
        .from('monitors')
        .select('*');

    if (error) throw error;
    return data as Monitor[];
};

export const getMonitor = async (
    chatId: string,
    address: string,
    chain: string = 'aptos',
    tokenAddress: string | null = null
): Promise<Monitor | null> => {
    let query = supabase
        .from('monitors')
        .select('*')
        .eq('chat_id', chatId)
        .eq('address', address)
        .eq('chain', chain);

    if (tokenAddress) {
        query = query.eq('token_address', tokenAddress);
    } else {
        query = query.is('token_address', null);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "Row not found"
    return data as Monitor | null;
};

export const updateLastAlerted = async (id: number): Promise<void> => {
    const { error } = await supabase
        .from('monitors')
        .update({ last_alerted_at: new Date().toISOString() })
        .eq('id', id);

    if (error) throw error;
};
