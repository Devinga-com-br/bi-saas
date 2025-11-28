/**
 * Audit logging utilities
 */

import { createClient } from '@/lib/supabase/client'

export type AuditModule = 'dashboard' | 'usuarios' | 'relatorios' | 'relatorios_venda_curva' | 'relatorios_perdas' | 'configuracoes' | 'metas' | 'despesas' | 'dre-gerencial' | 'descontos_venda'

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
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.rpc as any)('insert_audit_log', {
      p_module: module,
      p_sub_module: subModule || null,
      p_tenant_id: tenantId || null,
      p_user_name: userName || null,
      p_user_email: userEmail || user.email || null,
      p_action: action,
      p_metadata: metadata
    })
  } catch {
    // Silently fail - audit logs should not break the user experience
  }
}

/**
 * Hook to log page access
 */
export function useAuditLog() {
  return { logModuleAccess }
}
