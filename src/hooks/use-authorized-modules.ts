/**
 * Hook: useAuthorizedModules
 *
 * Verifica se o usuário tem acesso a módulos específicos do sistema
 * Superadmin e Admin sempre têm acesso full a todos os módulos
 * Usuários com role = 'user' precisam ter módulos autorizados configurados
 */

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SystemModule } from '@/types/modules'
import { ALL_MODULE_IDS } from '@/types/modules'

export interface AuthorizedModulesState {
  modules: SystemModule[]
  isLoading: boolean
  hasFullAccess: boolean
  hasModuleAccess: (moduleId: SystemModule) => boolean
  canAccessRoute: (route: string) => boolean
}

/**
 * Hook principal para verificar módulos autorizados
 */
export function useAuthorizedModules(userId?: string): AuthorizedModulesState {
  // Log FORA do useEffect para garantir que está sendo renderizado
  console.log('[useAuthorizedModules] 🎯 HOOK RENDERIZADO - Este log deve aparecer!')

  const [modules, setModules] = useState<SystemModule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasFullAccess, setHasFullAccess] = useState(false)

  useEffect(() => {
    console.log('[useAuthorizedModules] 🚀 Hook INICIADO (useEffect)', { userId })

    async function loadAuthorizedModules() {
      try {
        console.log('[useAuthorizedModules] 📥 Carregando módulos...')
        setIsLoading(true)
        const supabase = createClient()

        // Se userId não foi fornecido, obter usuário atual
        let targetUserId = userId
        if (!targetUserId) {
          const { data: { user } } = await supabase.auth.getUser()
          console.log('[useAuthorizedModules] 👤 Usuário autenticado:', user?.id)
          if (!user) {
            console.log('[useAuthorizedModules] ❌ Sem usuário autenticado')
            setIsLoading(false)
            return
          }
          targetUserId = user.id
        }

        // Obter perfil do usuário
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', targetUserId)
          .single() as { data: { role: string } | null }

        console.log('[useAuthorizedModules] User profile:', { userId: targetUserId, profile })

        if (!profile) {
          setIsLoading(false)
          return
        }

        // Superadmin e Admin sempre têm acesso full
        if (['superadmin', 'admin'].includes(profile.role)) {
          console.log('[useAuthorizedModules] Full access for role:', profile.role)
          setModules(ALL_MODULE_IDS)
          setHasFullAccess(true)
          setIsLoading(false)
          return
        }

        // Para role = user, buscar módulos autorizados
        if (profile.role === 'user') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: authorizedModules, error } = await (supabase as any)
            .from('user_authorized_modules')
            .select('module')
            .eq('user_id', targetUserId)

          console.log('[useAuthorizedModules] Query result:', { authorizedModules, error })

          if (error) {
            console.error('[useAuthorizedModules] Error loading authorized modules:', error)
            setModules([])
            setHasFullAccess(false)
          } else {
            const moduleIds = authorizedModules?.map((am: { module: string }) => am.module as SystemModule) || []
            console.log('[useAuthorizedModules] Loaded modules for user:', moduleIds)
            setModules(moduleIds)
            setHasFullAccess(false)
          }
        } else {
          // Viewer ou outros roles: sem acesso por padrão
          console.log('[useAuthorizedModules] No access for role:', profile.role)
          setModules([])
          setHasFullAccess(false)
        }

      } catch (error) {
        console.error('[useAuthorizedModules] ❌ ERRO:', error)
        setModules([])
        setHasFullAccess(false)
      } finally {
        setIsLoading(false)
        console.log('[useAuthorizedModules] ✅ Hook FINALIZADO')
      }
    }

    loadAuthorizedModules()
  }, [userId])

  // Função para verificar se tem acesso a um módulo específico
  const hasModuleAccess = (moduleId: SystemModule): boolean => {
    console.log('[hasModuleAccess] Verificando:', {
      moduleId,
      hasFullAccess,
      modules,
      includes: modules.includes(moduleId)
    })

    // Superadmin e Admin sempre têm acesso
    if (hasFullAccess) return true

    // Verificar se o módulo está na lista de módulos autorizados
    return modules.includes(moduleId)
  }

  // Função para verificar se pode acessar uma rota específica
  const canAccessRoute = (route: string): boolean => {
    // Superadmin e Admin sempre podem acessar
    if (hasFullAccess) return true

    // Mapeamento de rotas para módulos
    const routeModuleMap: Record<string, SystemModule> = {
      '/dashboard': 'dashboard',
      '/dre-gerencial': 'dre_gerencial',
      '/metas/mensal': 'metas_mensal',
      '/metas/setor': 'metas_setor',
      '/relatorios/ruptura-abcd': 'relatorios_ruptura_abcd',
      '/relatorios/venda-curva': 'relatorios_venda_curva',
      '/relatorios/ruptura-venda-60d': 'relatorios_ruptura_60d',
    }

    // Verificar se a rota corresponde a um módulo
    const moduleId = routeModuleMap[route]
    if (!moduleId) {
      // Rota não mapeada (ex: /configuracoes), permitir acesso
      return true
    }

    return hasModuleAccess(moduleId)
  }

  return {
    modules,
    isLoading,
    hasFullAccess,
    hasModuleAccess,
    canAccessRoute,
  }
}

/**
 * Hook simplificado para verificar se pode acessar uma rota específica
 * Útil para componentes que só precisam verificar uma rota
 */
export function useCanAccessRoute(route: string): {
  canAccess: boolean
  isLoading: boolean
} {
  const { canAccessRoute, isLoading } = useAuthorizedModules()

  return {
    canAccess: canAccessRoute(route),
    isLoading,
  }
}

/**
 * Hook simplificado para verificar se pode acessar um módulo específico
 * Útil para componentes que só precisam verificar um módulo
 */
export function useHasModuleAccess(moduleId: SystemModule): {
  hasAccess: boolean
  isLoading: boolean
} {
  const { hasModuleAccess, isLoading } = useAuthorizedModules()

  return {
    hasAccess: hasModuleAccess(moduleId),
    isLoading,
  }
}
