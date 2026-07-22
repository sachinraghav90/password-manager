import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  (import.meta as any).env.VITE_SUPABASE_URL || 'https://missing.supabase.co',
  (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'missing'
);
