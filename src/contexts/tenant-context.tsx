'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Tenant, UserProfile } from '@/types'

interface TenantContextType {
  currentTenant: Tenant | null
  accessibleTenants: Tenant[]
  userProfile: UserProfile | null
  loading: boolean
  canSwitchTenants: boolean
  switchTenant: (tenantId: string) => Promise<void>
  refreshTenants: () => Promise<void>
}

const TenantContext = createContext<TenantContextType | undefined>(undefined)

const CURRENT_TENANT_KEY = 'bi_saas_current_tenant_id'

export function TenantProvider({ children }: { children: ReactNode }) {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null)
  const [accessibleTenants, setAccessibleTenants] = useState<Tenant[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const loadTenants = useCallback(async () => {
    try {
      setLoading(true)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single() as { data: UserProfile | null; error: Error | null }

      if (profileError || !profile) {
        // Se o perfil não existe, fazer logout (pode ser email alterado ou RLS bloqueado)
        console.log('Perfil não encontrado ou acesso negado - fazendo logout')
        
        // Limpar completamente a sessão
        await supabase.auth.signOut()
        
        // Limpar localStorage
        localStorage.clear()
        
        // Forçar redirecionamento imediato
        setLoading(false)
        
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          // Usar replace para evitar histórico
          window.location.replace('/login?error=Acesso negado. Faça login novamente.')
        }
        return
      }

      setUserProfile(profile)

      // If user is superadmin, get ALL active tenants
      if (profile.role === 'superadmin') {

        const { data: allTenants, error: tenantsError } = await supabase
          .from('tenants')
          .select('*')
          .eq('is_active', true)
          .order('name') as { data: Tenant[] | null; error: Error | null }

        if (tenantsError) {
          console.error('TenantContext: Erro ao buscar tenants:', tenantsError)
        } else if (allTenants) {
          setAccessibleTenants(allTenants)

          // Set current tenant from localStorage or first accessible tenant
          const savedTenantId = localStorage.getItem(CURRENT_TENANT_KEY)
          const savedTenant = allTenants.find(t => t.id === savedTenantId)

          if (savedTenant) {
            setCurrentTenant(savedTenant)
          } else if (allTenants.length > 0) {
            setCurrentTenant(allTenants[0])
            localStorage.setItem(CURRENT_TENANT_KEY, allTenants[0].id)
          }
        }
      } else {
        // Regular user - get their own tenant

        if (!profile.tenant_id) {
          console.error('TenantContext: Usuário não-superadmin sem tenant_id')
          setLoading(false)
          return
        }

        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', profile.tenant_id)
          .single() as { data: Tenant | null; error: Error | null }

        if (tenantError) {
          console.error('TenantContext: Erro ao buscar tenant:', tenantError)
        } else if (tenant) {
          setCurrentTenant(tenant)
          setAccessibleTenants([tenant])
        }
      }

      setLoading(false)
    } catch (error) {
      console.error('Error loading tenants:', error)
      setLoading(false)
    }
  }, [supabase])

  const switchTenant = async (tenantId: string) => {
    const tenant = accessibleTenants.find(t => t.id === tenantId)
    if (tenant) {
      console.log('[TenantContext] Trocando tenant:', currentTenant?.name, '→', tenant.name)
      
      // 1. Salvar novo tenant no localStorage
      localStorage.setItem(CURRENT_TENANT_KEY, tenantId)
      
      // 2. Limpar outros dados do localStorage relacionados ao tenant anterior
      // Manter apenas o tenant_id e dados de autenticação
      const itemsToKeep = ['bi_saas_current_tenant_id', 'supabase.auth.token']
      const allKeys = Object.keys(localStorage)
      
      allKeys.forEach(key => {
        // Remover itens que não devem ser mantidos
        if (!itemsToKeep.some(keepKey => key.includes(keepKey))) {
          localStorage.removeItem(key)
        }
      })
      
      // 3. Atualizar estado
      setCurrentTenant(tenant)
      
      // 4. Forçar recarregamento completo da página para limpar todos os estados
      // Isso garante que:
      // - Todos os filtros de filiais sejam resetados
      // - Todos os caches SWR sejam limpos
      // - Todos os estados de componentes sejam reinicializados
      // - Todas as queries sejam refeitas com o novo tenant
      console.log('[TenantContext] Recarregando página para aplicar mudanças...')
      
      // Pequeno delay para garantir que o localStorage foi atualizado
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 100)
    }
  }

  const refreshTenants = async () => {
    await loadTenants()
  }

  useEffect(() => {
    loadTenants()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadTenants()
    })

    return () => subscription.unsubscribe()
  }, [loadTenants, supabase.auth])

  const canSwitchTenants = userProfile?.role === 'superadmin' && userProfile?.can_switch_tenants === true

  return (
    <TenantContext.Provider
      value={{
        currentTenant,
        accessibleTenants,
        userProfile,
        loading,
        canSwitchTenants,
        switchTenant,
        refreshTenants,
      }}
    >
      {children}
    </TenantContext.Provider>
  )
}

export function useTenantContext() {
  const context = useContext(TenantContext)
  if (context === undefined) {
    throw new Error('useTenantContext must be used within a TenantProvider')
  }
  return context
}
