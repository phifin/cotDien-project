import { createClient } from '@supabase/supabase-js'
import type { Database } from './types.js'

declare global {
  interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL?: string
    readonly VITE_SUPABASE_ANON_KEY?: string
    readonly DEV?: boolean
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}

// Notice: In Vite, import.meta.env is replaced at build time. 
// For this to work in a shared package, the consuming app must use Vite (which we do).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const isDev = Boolean(import.meta.env.DEV)

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
