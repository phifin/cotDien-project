import {
  createSupabaseBrowserClient,
  setSupabaseBrowserClient,
} from '@repo/supabase/client'

function readEnvString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

const supabaseUrl = readEnvString(import.meta.env.VITE_SUPABASE_URL)
const supabaseAnonKey = readEnvString(import.meta.env.VITE_SUPABASE_ANON_KEY)

const supabase = createSupabaseBrowserClient({
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
})

setSupabaseBrowserClient(supabase)

export { supabase }
