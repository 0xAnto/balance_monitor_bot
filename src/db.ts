import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl === 'PLACEHOLDER') {
    console.error('❌ Supabase credentials missing in .env');
    // We don't exit here to allow the verify script to run and show the error gracefully,
    // or we could throw. For now, let's just log.
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

export interface Monitor {
    id: number;
    chat_id: string;
    address: string;
    threshold: number;
    name?: string;
    created_at: string;
}

export const addMonitor = async (chatId: string, address: string, threshold: number = 10, name?: string): Promise<void> => {
    const { error } = await supabase
        .from('monitors')
        .insert({ chat_id: chatId, address, threshold, name });

    if (error) throw error;
};

export const removeMonitor = async (chatId: string, address: string): Promise<void> => {
    const { error } = await supabase
        .from('monitors')
        .delete()
        .match({ chat_id: chatId, address });

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

export const getMonitor = async (chatId: string, address: string): Promise<Monitor | null> => {
    const { data, error } = await supabase
        .from('monitors')
        .select('*')
        .match({ chat_id: chatId, address })
        .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "Row not found"
    return data as Monitor | null;
};
