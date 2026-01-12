'use client'

import * as React from 'react'
/* eslint-disable @next/next/no-img-element */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileBarChart,
  LucideIcon,
  Package,
  TrendingUp,
  Target,
  ChartBarBig,
  TrendingDown,
  ShoppingCart,
  AlertTriangle,
  Newspaper,
  Radio,
  ChevronRight,
  ChartCandlestick,
} from 'lucide-react'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
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
import { useTheme } from '@/contexts/theme-context'
import { Badge } from '@/components/ui/badge'
import { NavUser } from './nav-user'
import { SidebarCompanySwitcher } from './sidebar-company-switcher'
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
    name: 'Dashboard 360',
    href: '/dashboard',
    icon: LayoutDashboard,
    moduleId: 'dashboard',
  },
  {
    name: 'Dashboard Tempo Real',
    href: '/dashboard-tempo-real',
    icon: Radio,
    moduleId: 'dashboard_tempo_real',
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
  {
    name: 'Produtos sem Vendas',
    href: '/relatorios/produtos-sem-vendas',
    icon: ChartCandlestick,
    moduleId: 'relatorios_produtos_sem_vendas',
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
    name: 'Dias sem Giro',
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

export function AppSidebar() {
  const pathname = usePathname()
  const { userProfile, currentTenant } = useTenantContext()
  const { state } = useSidebar()
  const { theme } = useTheme()
  const { parameters } = useTenantParameters(currentTenant?.id)
  const { hasModuleAccess, hasFullAccess } = useAuthorizedModules()

  const logoSrc = theme === 'dark' ? '/logo_bussola_dark_mode.svg' : '/logo_bussola.svg'

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

  // Use tenant ID as key to force re-render when tenant changes
  return (
    <Sidebar collapsible="icon" variant="inset" key={currentTenant?.id || 'no-tenant'}>
      <SidebarHeader className="px-4 py-4">
        <Link href="/dashboard" className="flex items-center">
          {state === 'collapsed' ? (
            <img
              src="/simbolo_bussola.svg"
              alt="Bússola"
              style={{ height: '32px', width: '32px' }}
            />
          ) : (
            <img
              src={logoSrc}
              alt="Bússola ByDevIngá"
              style={{ height: '40px', width: 'auto' }}
            />
          )}
        </Link>
      </SidebarHeader>

      {/* Company Switcher */}
      <div className="p-2">
        <SidebarCompanySwitcher />
      </div>

      <SidebarContent>
        {/* Visão Geral */}
        <Collapsible defaultOpen className="group/collapsible">
          <SidebarGroup className="py-1">
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center">
                <span className="text-xs font-semibold">Visão Geral</span>
                <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarMenu>
                {filteredVisaoGeralNav.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                  const Icon = item.icon
                  const isLiveModule = item.href === '/dashboard-tempo-real'

                  return (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.name}
                        isActive={isActive}
                      >
                        <Link href={item.href}>
                          <Icon className={isLiveModule ? 'animate-pulse-live' : undefined} />
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
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Gerencial */}
        <Collapsible defaultOpen className="group/collapsible">
          <SidebarGroup className="py-1">
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center">
                <span className="text-xs font-semibold">Gerencial</span>
                <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
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
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Vendas */}
        {filteredVendasNav.length > 0 && (
          <Collapsible defaultOpen className="group/collapsible">
            <SidebarGroup className="py-1">
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center">
                  <span className="text-xs font-semibold">Vendas</span>
                  <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
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
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

        {/* Metas */}
        {filteredMetasNav.length > 0 && (
          <Collapsible defaultOpen className="group/collapsible">
            <SidebarGroup className="py-1">
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center">
                  <span className="text-xs font-semibold">Metas</span>
                  <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
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
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

        {/* Ruptura */}
        {filteredRupturaNav.length > 0 && (
          <Collapsible defaultOpen className="group/collapsible">
            <SidebarGroup className="py-1">
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center">
                  <span className="text-xs font-semibold">Ruptura</span>
                  <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
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
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

        {/* Perdas */}
        {filteredPerdasNav.length > 0 && (
          <Collapsible defaultOpen className="group/collapsible">
            <SidebarGroup className="py-1">
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center">
                  <span className="text-xs font-semibold">Perdas</span>
                  <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
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
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

      </SidebarContent>

      {/* Footer with User */}
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
