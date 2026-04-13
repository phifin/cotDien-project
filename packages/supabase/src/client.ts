import { createClient } from '@supabase/supabase-js'
import type { Database } from './types.js'

// Notice: In Vite, import.meta.env is replaced at build time. 
// For this to work in a shared package, the consuming app must use Vite (which we do).
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY
const isDev = Boolean((import.meta as any).env?.DEV)

// TEMP DEBUG: Vite env injection status (safe: no secret values logged)
console.info('[supabase] env check:', {
  hasViteSupabaseUrl: Boolean(supabaseUrl),
  hasViteSupabaseAnonKey: Boolean(supabaseAnonKey),
})

if (typeof window !== 'undefined') {
  ;(window as any).__DEBUG_ENV__ = {
    url: supabaseUrl,
    anon: supabaseAnonKey ? 'present' : 'missing',
  }
}

if ((!supabaseUrl || !supabaseAnonKey) && isDev) {
  console.warn(
    '[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables.\n' +
    'Please add them to your .env file in the consuming app.'
  )
}

export const supabase = createClient<Database>(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
)
