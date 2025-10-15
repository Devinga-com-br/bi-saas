/**
 * Audit logging utilities
 */

import { createClient } from '@/lib/supabase/client'

export type AuditModule = 'dashboard' | 'usuarios' | 'relatorios' | 'configuracoes'

interface AuditLogParams {
  module: AuditModule
  subModule?: string
  tenantId?: string
  userName?: string
  userEmail?: string
  action?: string
  metadata?: Record<string, unknown>
}

/**
 * Log user access to modules
 */
export async function logModuleAccess({
  module,
  subModule,
  tenantId,
  userName,
  userEmail,
  action = 'access',
  metadata = {}
}: AuditLogParams): Promise<void> {
  try {
    const supabase = createClient()
    
    const params = {
      p_module: module,
      p_sub_module: subModule || null,
      p_tenant_id: tenantId || null,
      p_user_name: userName || null,
      p_user_email: userEmail || null,
      p_action: action,
      p_metadata: metadata
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.rpc as any)('insert_audit_log', params)

    if (error) {
      console.error('[AUDIT] Error logging access:', error)
    }
  } catch (error) {
    console.error('[AUDIT] Exception logging access:', error)
  }
}

/**
 * Hook to log page access
 */
export function useAuditLog() {
  return { logModuleAccess }
}
