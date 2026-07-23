import { createClient } from '@supabase/supabase-js';

// Keep module initialization safe for typechecks/tests where Vite does not inject environment variables.
const env = (import.meta as any).env ?? {};
const supabaseUrl = env.VITE_SUPABASE_URL || 'https://missing.supabase.co';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || 'missing-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
