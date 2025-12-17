'use client'

import * as React from 'react'
import Image from 'next/image' 
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileBarChart,
  LucideIcon,
  Package,
  TrendingUp,
  Target,
  Cog,
  ChartBarBig,
  TrendingDown,
  ShoppingCart,
  AlertTriangle,
  Newspaper,
} from 'lucide-react'

// import { cn } from '@/lib/utils'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { useTenantContext } from '@/contexts/tenant-context'
import { Badge } from '@/components/ui/badge'
import { CompanySwitcher } from './company-switcher'
import { useTenantParameters } from '@/hooks/use-tenant-parameters'
import { useAuthorizedModules } from '@/hooks/use-authorized-modules'
import type { SystemModule } from '@/types/modules'

interface NavigationItem {
  name: string
  href: string
  icon: LucideIcon
  requiresSuperAdmin?: boolean
  requiresAdminOrAbove?: boolean
  badge?: string
  comingSoon?: boolean
  moduleId?: SystemModule
}

const visaoGeralNavigation: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    moduleId: 'dashboard',
  },
]

const gerencialNavigation: NavigationItem[] = [
  {
    name: 'DRE Gerencial',
    href: '/dre-gerencial',
    icon: ChartBarBig,
    moduleId: 'dre_gerencial',
  },
  {
    name: 'DRE Comparativo',
    href: '/dre-comparativo',
    icon: FileBarChart,
    moduleId: 'dre_comparativo',
  },
  {
    name: 'Descontos de Vendas',
    href: '/descontos-venda',
    icon: TrendingDown,
  },
]

const vendasNavigation: NavigationItem[] = [
  {
    name: 'Vendas por Curva',
    href: '/relatorios/venda-curva',
    icon: ShoppingCart,
    moduleId: 'relatorios_venda_curva',
  },
]

const metasNavigation: NavigationItem[] = [
  {
    name: 'Meta Mensal',
    href: '/metas/mensal',
    icon: TrendingUp,
    moduleId: 'metas_mensal',
  },
  {
    name: 'Meta por Setor',
    href: '/metas/setor',
    icon: Target,
    moduleId: 'metas_setor',
  },
]

const rupturaNavigation: NavigationItem[] = [
  {
    name: 'Previsão de Ruptura',
    href: '/relatorios/previsao-ruptura',
    icon: TrendingDown,
    moduleId: 'relatorios_previsao_ruptura',
  },
  {
    name: 'Ruptura ABCD',
    href: '/relatorios/ruptura-abcd',
    icon: AlertTriangle,
    moduleId: 'relatorios_ruptura_abcd',
  },
  {
    name: 'Ruptura Venda 60d',
    href: '/relatorios/ruptura-venda-60d',
    icon: Package,
    moduleId: 'relatorios_ruptura_60d',
  },
]

const perdasNavigation: NavigationItem[] = [
  {
    name: 'Relatório de Perdas',
    href: '/relatorios/perdas',
    icon: Newspaper,
    moduleId: 'relatorios_perdas',
  },
]

const accountNavigation: NavigationItem[] = [
  {
    name: 'Configurações',
    href: '/configuracoes',
    icon: Cog,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { userProfile, currentTenant } = useTenantContext()
  const { state } = useSidebar()
  const { parameters } = useTenantParameters(currentTenant?.id)
  const { hasModuleAccess, hasFullAccess } = useAuthorizedModules()

  const isSuperAdmin = userProfile?.role === 'superadmin'
  const isAdminOrAbove = ['superadmin', 'admin'].includes(userProfile?.role || '')

  // Filter navigation items based on user role, tenant parameters, and authorized modules
  const filterNavigation = (items: NavigationItem[]) => items.filter(item => {
    if (item.requiresSuperAdmin && !isSuperAdmin) {
      return false
    }
    if (item.requiresAdminOrAbove && !isAdminOrAbove) {
      return false
    }
    // Filter "Descontos de Vendas" based on tenant parameter
    if (item.href === '/descontos-venda' && !parameters.enable_descontos_venda) {
      return false
    }
    // Filter based on authorized modules (only for users with role = 'user')
    if (item.moduleId && !hasFullAccess && !hasModuleAccess(item.moduleId)) {
      return false
    }
    return true
  })

  const filteredVisaoGeralNav = filterNavigation(visaoGeralNavigation)
  const filteredGerencialNav = filterNavigation(gerencialNavigation)
  const filteredVendasNav = filterNavigation(vendasNavigation)
  const filteredMetasNav = filterNavigation(metasNavigation)
  const filteredRupturaNav = filterNavigation(rupturaNavigation)
  const filteredPerdasNav = filterNavigation(perdasNavigation)
  const filteredAccountNav = filterNavigation(accountNavigation)

  // Use tenant ID as key to force re-render when tenant changes
  return (
    <Sidebar collapsible="icon" key={currentTenant?.id || 'no-tenant'}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Image src="/favicon/ico_192x192.png" alt="DevIngá" width={32} height={32} />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">DevIngá</span>
                  <span className="truncate text-xs">Business Intelligence</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Visão Geral */}
        <SidebarGroup>
          <SidebarGroupLabel className="relative mb-2">
            <span className="relative z-10 bg-sidebar pr-3 text-xs font-semibold">Visão Geral</span>
            <div className="absolute left-24 right-2 top-1/2 h-[2px] bg-gradient-to-r from-border via-border/80 to-transparent rounded-full" />
          </SidebarGroupLabel>
          <SidebarMenu>
            {filteredVisaoGeralNav.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
              const Icon = item.icon

              return (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.name}
                    isActive={isActive}
                  >
                    <Link href={item.href}>
                      <Icon />
                      <span>{item.name}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>

        {/* Gerencial */}
        <SidebarGroup>
          <SidebarGroupLabel className="relative mb-2">
            <span className="relative z-10 bg-sidebar pr-3 text-xs font-semibold">Gerencial</span>
            <div className="absolute left-20 right-2 top-1/2 h-[2px] bg-gradient-to-r from-border via-border/80 to-transparent rounded-full" />
          </SidebarGroupLabel>
          <SidebarMenu>
            {filteredGerencialNav.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && item.href !== '#' && pathname.startsWith(item.href))
              const Icon = item.icon

              return (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    asChild={!item.comingSoon}
                    tooltip={item.name}
                    isActive={isActive}
                    disabled={item.comingSoon}
                  >
                    {item.comingSoon ? (
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Icon />
                          <span>{item.name}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          Em breve
                        </Badge>
                      </div>
                    ) : (
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.name}</span>
                        {item.badge && (
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>

        {/* Vendas */}
        {filteredVendasNav.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="relative mb-2">
              <span className="relative z-10 bg-sidebar pr-3 text-xs font-semibold">Vendas</span>
              <div className="absolute left-16 right-2 top-1/2 h-[2px] bg-gradient-to-r from-border via-border/80 to-transparent rounded-full" />
            </SidebarGroupLabel>
            <SidebarMenu>
              {filteredVendasNav.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href)
                const Icon = item.icon

                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.name}
                      isActive={isActive}
                    >
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        )}

        {/* Metas */}
        {filteredMetasNav.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="relative mb-2">
              <span className="relative z-10 bg-sidebar pr-3 text-xs font-semibold">Metas</span>
              <div className="absolute left-14 right-2 top-1/2 h-[2px] bg-gradient-to-r from-border via-border/80 to-transparent rounded-full" />
            </SidebarGroupLabel>
            <SidebarMenu>
              {filteredMetasNav.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href)
                const Icon = item.icon

                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.name}
                      isActive={isActive}
                    >
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        )}

        {/* Ruptura */}
        {filteredRupturaNav.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="relative mb-2">
              <span className="relative z-10 bg-sidebar pr-3 text-xs font-semibold">Ruptura</span>
              <div className="absolute left-16 right-2 top-1/2 h-[2px] bg-gradient-to-r from-border via-border/80 to-transparent rounded-full" />
            </SidebarGroupLabel>
            <SidebarMenu>
              {filteredRupturaNav.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href)
                const Icon = item.icon

                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.name}
                      isActive={isActive}
                    >
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        )}

        {/* Perdas */}
        {filteredPerdasNav.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="relative mb-2">
              <span className="relative z-10 bg-sidebar pr-3 text-xs font-semibold">Perdas</span>
              <div className="absolute left-14 right-2 top-1/2 h-[2px] bg-gradient-to-r from-border via-border/80 to-transparent rounded-full" />
            </SidebarGroupLabel>
            <SidebarMenu>
              {filteredPerdasNav.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href)
                const Icon = item.icon

                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.name}
                      isActive={isActive}
                    >
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        )}

        {/* Conta */}
        <SidebarGroup>
          <SidebarGroupLabel className="relative mb-2">
            <span className="relative z-10 bg-sidebar pr-3 text-xs font-semibold">Conta</span>
            <div className="absolute left-12 right-2 top-1/2 h-[2px] bg-gradient-to-r from-border via-border/80 to-transparent rounded-full" />
          </SidebarGroupLabel>
          <SidebarMenu>
            {filteredAccountNav.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon

              return (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.name}
                    isActive={isActive}
                  >
                    <Link href={item.href}>
                      <Icon />
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with Company Switcher */}
      <SidebarFooter>
        {state === "expanded" && (
          <SidebarMenu>
            <SidebarMenuItem>
              <CompanySwitcher />
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
