'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  Settings,
  ChevronRight,
  BarChart3,
  FileBarChart,
  Users,
  Building2,
} from 'lucide-react'

import { cn } from '@/lib/utils'
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useTenantContext } from '@/contexts/tenant-context'
import { Badge } from '@/components/ui/badge'

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Empresas',
    href: '/empresas',
    icon: Building2,
    requiresSuperAdmin: true,
  },
  {
    name: 'Usuários',
    href: '/usuarios',
    icon: Users,
    requiresAdminOrAbove: true,
  },
  {
    name: 'Relatórios',
    href: '/relatorios',
    icon: FileText,
    badge: 'Em breve',
    items: [
      {
        name: 'Visão Geral',
        href: '/relatorios/visao-geral',
        icon: BarChart3,
      },
      {
        name: 'Vendas',
        href: '/relatorios/vendas',
        icon: FileBarChart,
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
        name: 'Organização',
        href: '/configuracoes/organizacao',
        icon: Building2,
      },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { userProfile, currentTenant } = useTenantContext()

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
  })

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <BarChart3 className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">BI System</span>
                  <span className="truncate text-xs">Business Intelligence</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
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

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="cursor-default hover:bg-transparent">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary/10">
                <Building2 className="size-4 text-sidebar-primary" />
              </div>
              <div className="grid flex-1 text-left text-xs leading-tight">
                <span className="truncate font-medium">
                  {currentTenant?.name || 'Carregando...'}
                </span>
                <span className="truncate text-muted-foreground capitalize">
                  {userProfile?.role || 'user'}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
