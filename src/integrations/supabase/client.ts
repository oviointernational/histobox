import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Access variables from window.__HISTOBOX_ENV__ injected by AI Studio or fallback to standard env vars
const env = (typeof window !== 'undefined' && (window as any).__HISTOBOX_ENV__) || {};

// Publishable (anon) credentials — safe to include in client-side code
const SUPABASE_URL =
  env.SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_URL ||
  'https://hadhsnhjbqygtvtmyuuz.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  env.SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_aU_2jiMdd3YduYLxqh0xgw_Dr8Mo_4c';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});