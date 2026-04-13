import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types.js'

export function createSupabaseBrowserClient(input: {
  url: string
  anonKey: string
}): SupabaseClient<Database> {
  return createClient<Database>(input.url, input.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })
}

let activeSupabaseClient: SupabaseClient<Database> | null = null

export function setSupabaseBrowserClient(client: SupabaseClient<Database>): void {
  activeSupabaseClient = client
}

export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (!activeSupabaseClient) {
    throw new Error('Supabase client is not initialized. Initialize it in app-level bootstrap first.')
  }
  return activeSupabaseClient
}
