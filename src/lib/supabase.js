import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// When both env vars are present the app talks to Supabase.
// Otherwise it runs in local demo mode (see store.js).
export const isSupabaseMode = Boolean(url && anonKey)
export const supabase = isSupabaseMode ? createClient(url, anonKey) : null
