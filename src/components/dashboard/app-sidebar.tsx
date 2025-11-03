'use client'

import * as React from 'react'
import Image from 'next/image' 
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  ChevronRight,
  LucideIcon,
  Package,
  TrendingUp,
  Target,
  DollarSign,
  Cog,
  ChartBarBig,
  TrendingDown,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useTenantContext } from '@/contexts/tenant-context'
import { Badge } from '@/components/ui/badge'
import { CompanySwitcher } from './company-switcher'
import { useTenantParameters } from '@/hooks/use-tenant-parameters'

interface NavigationSubItem {
  name: string
  href: string
  icon: LucideIcon
  requiresSuperAdmin?: boolean
  requiresAdminOrAbove?: boolean
}

interface NavigationItem {
  name: string
  href: string
  icon: LucideIcon
  requiresSuperAdmin?: boolean
  requiresAdminOrAbove?: boolean
  badge?: string
  items?: NavigationSubItem[]
}

const visaoGeralNavigation: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
]

const gerencialNavigation: NavigationItem[] = [
  {
    name: 'Despesas',
    href: '/despesas',
    icon: DollarSign,
  },
  {
    name: 'Descontos Venda',
    href: '/descontos-venda',
    icon: TrendingDown,
  },
  {
    name: 'DRE Gerencial',
    href: '/dre-gerencial',
    icon: ChartBarBig,
  },
  {
    name: 'Metas',
    href: '/metas',
    icon: Target,
    items: [
      {
        name: 'Meta Mensal',
        href: '/metas/mensal',
        icon: TrendingUp,
      },
      {
        name: 'Meta por Setor',
        href: '/metas/setor',
        icon: Target,
      },
    ],
  },
  {
    name: 'Relatórios',
    href: '/relatorios',
    icon: FileText,
    items: [
      {
        name: 'Ruptura ABCD',
        href: '/relatorios/ruptura-abcd',
        icon: Package,
      },
      {
        name: 'Venda por Curva',
        href: '/relatorios/venda-curva',
        icon: TrendingUp,
      },
      {
        name: 'Ruptura Venda 60d',
        href: '/relatorios/ruptura-venda-60d',
        icon: Package,
      },
    ],
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
  const { parameters, loading: parametersLoading } = useTenantParameters(currentTenant?.id)

  const isSuperAdmin = userProfile?.role === 'superadmin'
  const isAdminOrAbove = ['superadmin', 'admin'].includes(userProfile?.role || '')

  // Log when parameters change for debugging
  React.useEffect(() => {
    console.log('[AppSidebar] Parameters updated:', parameters, 'Tenant:', currentTenant?.id)
  }, [parameters, currentTenant?.id])

  // Filter navigation items based on user role and tenant parameters
  const filterNavigation = (items: NavigationItem[]) => items.filter(item => {
    if (item.requiresSuperAdmin && !isSuperAdmin) {
      return false
    }
    if (item.requiresAdminOrAbove && !isAdminOrAbove) {
      return false
    }
    // Filter "Descontos Venda" based on tenant parameter
    if (item.href === '/descontos-venda' && !parameters.enable_descontos_venda) {
      return false
    }
    return true
  }).map(item => {
    // Filter subitems based on role if the item has subitems
    if (item.items) {
      return {
        ...item,
        items: item.items.filter(subItem => {
          if (subItem.requiresSuperAdmin && !isSuperAdmin) {
            return false
          }
          if (subItem.requiresAdminOrAbove && !isAdminOrAbove) {
            return false
          }
          return true
        })
      }
    }
    return item
  })

  const filteredVisaoGeralNav = filterNavigation(visaoGeralNavigation)
  const filteredGerencialNav = filterNavigation(gerencialNavigation)
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
        {/* Company Switcher - Only show when sidebar is expanded */}
        {state === "expanded" && (
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <CompanySwitcher />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}

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

              if (item.items) {
                const hasActiveChild = item.items.some((child) =>
                  pathname === child.href || pathname.startsWith(child.href)
                )

                return (
                  <Collapsible key={item.name} asChild defaultOpen={hasActiveChild}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={item.name}
                          className={cn((isActive || hasActiveChild) && 'bg-sidebar-accent')}
                        >
                          <Icon />
                          <span>{item.name}</span>
                          {item.badge && (
                            <Badge variant="secondary" className="ml-auto text-xs">
                              {item.badge}
                            </Badge>
                          )}
                          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((subItem) => {
                            const SubIcon = subItem.icon
                            const isSubActive = pathname === subItem.href || pathname.startsWith(subItem.href)

                            return (
                              <SidebarMenuSubItem key={subItem.name}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={isSubActive}
                                >
                                  <Link href={subItem.href}>
                                    <SubIcon />
                                    <span>{subItem.name}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            )
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                )
              }

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

        {/* Gerencial */}
        <SidebarGroup>
          <SidebarGroupLabel className="relative mb-2">
            <span className="relative z-10 bg-sidebar pr-3 text-xs font-semibold">Gerencial</span>
            <div className="absolute left-20 right-2 top-1/2 h-[2px] bg-gradient-to-r from-border via-border/80 to-transparent rounded-full" />
          </SidebarGroupLabel>
          <SidebarMenu>
            {filteredGerencialNav.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
              const Icon = item.icon

              if (item.items) {
                const hasActiveChild = item.items.some((child) =>
                  pathname === child.href || pathname.startsWith(child.href)
                )

                return (
                  <Collapsible key={item.name} asChild defaultOpen={hasActiveChild}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={item.name}
                          className={cn((isActive || hasActiveChild) && 'bg-sidebar-accent')}
                        >
                          <Icon />
                          <span>{item.name}</span>
                          {item.badge && (
                            <Badge variant="secondary" className="ml-auto text-xs">
                              {item.badge}
                            </Badge>
                          )}
                          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((subItem) => {
                            const SubIcon = subItem.icon
                            const isSubActive = pathname === subItem.href || pathname.startsWith(subItem.href)

                            return (
                              <SidebarMenuSubItem key={subItem.name}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={isSubActive}
                                >
                                  <Link href={subItem.href}>
                                    <SubIcon />
                                    <span>{subItem.name}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            )
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                )
              }

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

        {/* Conta Section with Divider */}
        <SidebarGroup>
          <SidebarGroupLabel className="relative mb-2">
            <span className="relative z-10 bg-sidebar pr-3 text-xs font-semibold">Conta</span>
            <div className="absolute left-12 right-2 top-1/2 h-[2px] bg-gradient-to-r from-border via-border/80 to-transparent rounded-full" />
          </SidebarGroupLabel>
          <SidebarMenu>
            {filteredAccountNav.map((item) => {
              const Icon = item.icon

              if (item.items) {
                const hasActiveChild = item.items.some((child) =>
                  pathname === child.href || pathname.startsWith(child.href)
                )
                const isActive = pathname === item.href || hasActiveChild

                return (
                  <Collapsible key={item.name} asChild defaultOpen={hasActiveChild}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={item.name}
                          className={cn((isActive || hasActiveChild) && 'bg-sidebar-accent')}
                        >
                          <Icon />
                          <span>{item.name}</span>
                          {item.badge && (
                            <Badge variant="secondary" className="ml-auto text-xs">
                              {item.badge}
                            </Badge>
                          )}
                          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((subItem) => {
                            const SubIcon = subItem.icon
                            const isSubActive = pathname === subItem.href || pathname.startsWith(subItem.href)

                            return (
                              <SidebarMenuSubItem key={subItem.name}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={isSubActive}
                                >
                                  <Link href={subItem.href}>
                                    <SubIcon />
                                    <span>{subItem.name}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            )
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                )
              }

              const isActive = pathname === item.href
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
    </Sidebar>
  )
}
