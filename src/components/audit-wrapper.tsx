'use client'

import { useEffect, useState } from 'react'
import { useTenantContext } from '@/contexts/tenant-context'
import { logModuleAccess, type AuditModule } from '@/lib/audit'
import { createClient } from '@/lib/supabase/client'

interface AuditWrapperProps {
  module: AuditModule
  subModule?: string
  children: React.ReactNode
}

/**
 * Wrapper component to log module access
 */
export function AuditWrapper({ module, subModule, children }: AuditWrapperProps) {
  const { currentTenant, userProfile } = useTenantContext()
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const getUserEmail = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setUserEmail(user.email)
      }
    }
    getUserEmail()
  }, [])

  useEffect(() => {
    if (currentTenant && userProfile && userEmail) {
      logModuleAccess({
        module,
        subModule,
        tenantId: currentTenant.id,
        userName: userProfile.full_name,
        userEmail
      })
    }
  }, [module, subModule, currentTenant, userProfile, userEmail])

  return <>{children}</>
}
