/**
 * @repo/supabase — public API
 *
 * Prefer subpath imports for tree-shaking:
 *   import { getSupabaseClient } from '@repo/supabase/client'
 *   import type { Database } from '@repo/supabase/types'
 */

export { createSupabaseClient, getSupabaseClient } from './client.js'
export type { Database } from './types.js'
export * from './queries.js'
