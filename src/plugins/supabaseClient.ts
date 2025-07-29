import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: true,       // ✅ Enables storing session in localStorage (or Capacitor Preferences on native)
        autoRefreshToken: true,     // ✅ Automatically refresh expired tokens
        detectSessionInUrl: true    // ✅ Parses session from OAuth redirect URL (enabled by default)
    }
});
