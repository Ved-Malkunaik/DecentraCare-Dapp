import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve .env from root
const __fallback_filename = fileURLToPath(import.meta.url);
const __fallback_dirname = path.dirname(__fallback_filename);
dotenv.config({ path: path.resolve(__fallback_dirname, '../../.env') });

// Try to get from env (check multiple common names)
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase configuration missing in backend! Make sure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY are set.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
