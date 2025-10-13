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
        console.error('Error loading profile:', profileError)
        setLoading(false)
        return
      }

      setUserProfile(profile)

      // If user is superadmin, get ALL active tenants
      if (profile.role === 'superadmin') {
        console.log('TenantContext: Superadmin detectado - buscando todos os tenants')

        const { data: allTenants, error: tenantsError } = await supabase
          .from('tenants')
          .select('*')
          .eq('is_active', true)
          .order('name') as { data: Tenant[] | null; error: Error | null }

        if (tenantsError) {
          console.error('TenantContext: Erro ao buscar tenants:', tenantsError)
        } else if (allTenants) {
          console.log(`TenantContext: ${allTenants.length} tenants encontrados`)
          setAccessibleTenants(allTenants)

          // Set current tenant from localStorage or first accessible tenant
          const savedTenantId = localStorage.getItem(CURRENT_TENANT_KEY)
          const savedTenant = allTenants.find(t => t.id === savedTenantId)

          if (savedTenant) {
            console.log('TenantContext: Restaurando tenant do localStorage:', savedTenant.name)
            setCurrentTenant(savedTenant)
          } else if (allTenants.length > 0) {
            console.log('TenantContext: Usando primeiro tenant:', allTenants[0].name)
            setCurrentTenant(allTenants[0])
            localStorage.setItem(CURRENT_TENANT_KEY, allTenants[0].id)
          }
        }
      } else {
        // Regular user - get their own tenant
        console.log('TenantContext: Usuário normal - buscando tenant próprio')

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
          console.log('TenantContext: Tenant encontrado:', tenant.name)
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
      setCurrentTenant(tenant)
      localStorage.setItem(CURRENT_TENANT_KEY, tenantId)
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
  }, [loadTenants])

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
