'use client'

/**
 * RouteGuard Component
 *
 * Protege rotas baseado nos módulos autorizados do usuário.
 * Redireciona para o primeiro módulo autorizado se tentar acessar rota não autorizada.
 */

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthorizedModules } from '@/hooks/use-authorized-modules'
import { SYSTEM_MODULES } from '@/types/modules'

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { canAccessRoute, isLoading, modules, hasFullAccess } = useAuthorizedModules()

  useEffect(() => {
    // Não fazer nada enquanto está carregando
    if (isLoading) return

    // Rotas que sempre são acessíveis (não precisam de módulo específico)
    const publicRoutes = ['/configuracoes', '/perfil']
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

    if (isPublicRoute) {
      return
    }

    // Verificar se pode acessar a rota atual
    const hasAccess = canAccessRoute(pathname)

    if (!hasAccess) {
      // Se não tem acesso, redirecionar para o primeiro módulo autorizado
      if (modules.length > 0) {
        const firstModule = SYSTEM_MODULES.find(m => modules.includes(m.id))

        if (firstModule) {
          router.replace(firstModule.route)
          return
        }
      }

      // Se não tem nenhum módulo autorizado, redirecionar para configurações
      router.replace('/configuracoes')
    }
  }, [pathname, isLoading, canAccessRoute, modules, hasFullAccess, router])

  // Mostrar o conteúdo enquanto carrega ou se tiver acesso
  return <>{children}</>
}
