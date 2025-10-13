'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import type { UserWithTenant, UserProfile } from '@/types'

export function useTenant() {
  const [profile, setProfile] = useState<UserWithTenant | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const getProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          console.log('useTenant: Nenhum usuário autenticado')
          setLoading(false)
          return
        }

        console.log('useTenant: Buscando perfil para user:', user.id)
        console.log('useTenant: Email do usuário logado:', user.email)

        // Primeiro buscar o perfil do usuário
        const { data: userProfile, error: profileError } = (await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single()) as { data: UserProfile | null; error: Error | null }

        if (profileError || !userProfile) {
          console.error('useTenant: Erro ao buscar perfil:', profileError)
          setLoading(false)
          return
        }

        // Se o usuário tem tenant_id, buscar o tenant
        let tenant = null
        if (userProfile.tenant_id) {
          const { data: tenantData } = (await supabase
            .from('tenants')
            .select('*')
            .eq('id', userProfile.tenant_id)
            .single()) as { data: { id: string; name: string; [key: string]: unknown } | null }

          tenant = tenantData
        }

        const profileWithTenant = {
          ...userProfile,
          tenant,
        } as unknown as UserWithTenant

        console.log('✅ useTenant: Perfil carregado:')
        console.log('   - ID:', userProfile.id)
        console.log('   - Nome:', userProfile.full_name)
        console.log('   - Email:', user.email)
        console.log('   - Role:', userProfile.role)
        console.log('   - Tenant:', tenant?.name || 'Superadmin (sem tenant específico)')
        console.log('   - Tenant ID:', userProfile.tenant_id || 'null (superadmin)')

        setProfile(profileWithTenant)
        setLoading(false)
      } catch (err) {
        console.error('useTenant: Erro inesperado:', err)
        setLoading(false)
      }
    }

    getProfile()
  }, [supabase])

  return { profile, loading }
}