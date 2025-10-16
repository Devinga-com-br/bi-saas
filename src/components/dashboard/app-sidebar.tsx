'use client'

import * as React from 'react'
import Image from 'next/image' 
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  Settings,
  ChevronRight,
  Users,
  Building2,
  LucideIcon,
  Package,
  TrendingUp,
  Target,
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

const navigation: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Usuários',
    href: '/usuarios',
    icon: Users,
    requiresAdminOrAbove: true,
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
    ],
  },
  {
    name: 'Configurações',
    href: '/configuracoes',
    icon: Settings,
    items: [
      {
        name: 'Perfil',
        href: '/perfil',
        icon: Users,
      },
      {
        name: 'Setores',
        href: '/configuracoes/setores',
        icon: Building2,
        requiresAdminOrAbove: true,
      },
      {
        name: 'Empresas',
        href: '/empresas',
        icon: Building2,
        requiresSuperAdmin: true,
      },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { userProfile } = useTenantContext()
  const { state } = useSidebar()

  const isSuperAdmin = userProfile?.role === 'superadmin'
  const isAdminOrAbove = ['superadmin', 'admin'].includes(userProfile?.role || '')

  // Filter navigation items based on user role
  const filteredNavigation = navigation.filter(item => {
    if (item.requiresSuperAdmin && !isSuperAdmin) {
      return false
    }
    if (item.requiresAdminOrAbove && !isAdminOrAbove) {
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

  return (
    <Sidebar collapsible="icon">
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

        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarMenu>
            {filteredNavigation.map((item) => {
              // Check if current path matches item or starts with item path
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
      </SidebarContent>
    </Sidebar>
  )
}
