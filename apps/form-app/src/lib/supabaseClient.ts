import {
  createSupabaseBrowserClient,
  setSupabaseBrowserClient,
} from '@repo/supabase/client'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// TEMP DEBUG: verify app-level env injection
console.info('[form-app] env check:', {
  hasViteSupabaseUrl: Boolean(supabaseUrl),
  hasViteSupabaseAnonKey: Boolean(supabaseAnonKey),
})

if (typeof window !== 'undefined') {
  ;(window as Window & { __DEBUG_ENV__?: unknown }).__DEBUG_ENV__ = {
    app: 'form-app',
    url: supabaseUrl,
    anon: supabaseAnonKey ? 'present' : 'missing',
  }
}

const supabase = createSupabaseBrowserClient({
  url: supabaseUrl ?? '',
  anonKey: supabaseAnonKey ?? '',
})

setSupabaseBrowserClient(supabase)

export { supabase }
