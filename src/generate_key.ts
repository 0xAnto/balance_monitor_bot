import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials missing in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const generateKey = async () => {
    const key = 'KEY-' + crypto.randomBytes(4).toString('hex').toUpperCase();

    const { error } = await supabase
        .from('api_keys')
        .insert({ key });

    if (error) {
        console.error('❌ Failed to generate key:', error.message);
    } else {
        console.log(`✅ Generated API Key: ${key}`);
    }
};

generateKey();
