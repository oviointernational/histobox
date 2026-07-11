import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Access variables from window.__HISTOBOX_ENV__ injected by AI Studio or fallback to standard env vars
const env = (typeof window !== 'undefined' && (window as any).__HISTOBOX_ENV__) || {};
const SUPABASE_URL = env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_PUBLISHABLE_KEY = env.SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});