'use client'

import { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTenantContext } from '@/contexts/tenant-context'
import { logModuleAccess } from '@/lib/audit'
import { createClient } from '@/lib/supabase/client'

export default function ConfiguracoesPage() {
  const { currentTenant, userProfile } = useTenantContext()

  useEffect(() => {
    const logAccess = async () => {
      if (currentTenant && userProfile) {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        logModuleAccess({
          module: 'configuracoes',
          tenantId: currentTenant.id,
          userName: userProfile.full_name,
          userEmail: user?.email || ''
        })
      }
    }
    logAccess()
  }, [currentTenant, userProfile])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie as configurações do sistema
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configurações do Tenant</CardTitle>
          <CardDescription>
            Em breve: configurações específicas da empresa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Funcionalidade em desenvolvimento
          </p>
        </CardContent>
      </Card>
    </div>
  )
}