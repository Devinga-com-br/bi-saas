import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Singleton instance for reuse
let adminClientInstance: SupabaseClient | null = null

/**
 * Create a Supabase client with Service Role key for admin operations.
 *
 * IMPORTANT: This client bypasses RLS and should ONLY be used in:
 * - Server-side API routes
 * - Operations that require elevated privileges
 * - Never expose this client to the browser
 *
 * @throws Error if SUPABASE_SERVICE_ROLE_KEY is not configured
 */
export function createAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured')
  }

  if (!supabaseServiceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not configured. ' +
      'This key is required for admin operations. ' +
      'DO NOT use NEXT_PUBLIC_SUPABASE_ANON_KEY as fallback.'
    )
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Get a singleton admin client instance.
 * Use this when you need to reuse the same client across multiple calls.
 *
 * @throws Error if SUPABASE_SERVICE_ROLE_KEY is not configured
 */
export function getAdminClient(): SupabaseClient {
  if (!adminClientInstance) {
    adminClientInstance = createAdminClient()
  }
  return adminClientInstance
}

/**
 * Create a direct Supabase client without caching.
 * This is useful for operations that need fresh data.
 *
 * SECURITY: This function does NOT accept fallback keys.
 * If SERVICE_ROLE_KEY is not available, it throws an error.
 *
 * @throws Error if SUPABASE_SERVICE_ROLE_KEY is not configured
 */
export function createDirectClient(): SupabaseClient {
  return createAdminClient()
}
