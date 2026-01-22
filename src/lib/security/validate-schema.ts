import { createClient } from '@/lib/supabase/server'
import type { UserProfile } from '@/types'

/**
 * Basic schema name validation (format only).
 * We avoid a static whitelist so new tenants don't require code changes.
 */
export function isValidSchema(schema: string): boolean {
  return /^[a-z0-9_]+$/.test(schema)
}

/**
 * Validates if a user has access to a specific schema.
 *
 * Rules:
 * 1. Schema must be in the whitelist
 * 2. Superadmin with can_switch_tenants=true can access any active tenant
 * 3. Regular users can only access their own tenant's schema
 *
 * @param supabase - Supabase client instance
 * @param user - User object with id
 * @param requestedSchema - Schema being accessed
 * @returns Promise<boolean> - true if access is allowed
 */
export async function validateSchemaAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string },
  requestedSchema: string
): Promise<boolean> {
  // Fast format validation first
  if (!isValidSchema(requestedSchema)) return false

  // Fetch user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, can_switch_tenants, tenant_id')
    .eq('id', user.id)
    .single() as { data: Pick<UserProfile, 'role' | 'can_switch_tenants' | 'tenant_id'> | null; error: unknown }

  if (!profile) {
    return false
  }

  // Superadmin with switch permission can access any active tenant
  if (profile.role === 'superadmin' && profile.can_switch_tenants === true) {
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id')
      .eq('supabase_schema', requestedSchema)
      .eq('is_active', true)
      .single()
    
    return !!tenant && !error
  }

  // Regular user can only access their own tenant
  if (profile.tenant_id) {
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('supabase_schema')
      .eq('id', profile.tenant_id)
      .single()

    if (error || !tenant) {
      return false
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (tenant as any).supabase_schema === requestedSchema
  }

  return false
}

/**
 * Helper to create a standardized forbidden response.
 */
export function forbiddenResponse() {
  return { error: 'Forbidden' }
}

/**
 * Helper to create a standardized unauthorized response.
 */
export function unauthorizedResponse() {
  return { error: 'Unauthorized' }
}
