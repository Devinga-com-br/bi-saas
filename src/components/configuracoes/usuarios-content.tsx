'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UserPlus, Users, Shield, Pencil, Trash2, Building2 } from 'lucide-react'
import type { Database } from '@/types/database.types'
import type { UserProfile as UP } from '@/types'

type UserProfile = UP & {
  tenants?: Database['public']['Tables']['tenants']['Row'] | null
}

interface UsuariosContentProps {
  currentUserRole: string
  currentUserTenantId: string | null
}

export function UsuariosContent({ currentUserRole, currentUserTenantId }: UsuariosContentProps) {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUsers = async () => {
      const supabase = createClient()

      let usersQuery = supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      // If admin, only show users from their tenant AND exclude superadmins
      if (currentUserRole === 'admin' && currentUserTenantId) {
        usersQuery = usersQuery
          .eq('tenant_id', currentUserTenantId)
          .neq('role', 'superadmin')
      }

      const { data: userProfiles } = (await usersQuery) as { data: UP[] | null }

      // Buscar todos os tenants únicos dos usuários
      const tenantIds = [...new Set(userProfiles?.map(u => u.tenant_id).filter(Boolean) as string[])]

      const tenantsMap = new Map()
      if (tenantIds.length > 0) {
        const { data: tenants } = (await supabase
          .from('tenants')
          .select('id, name, slug')
          .in('id', tenantIds)) as { data: { id: string; name: string; slug: string }[] | null }

        tenants?.forEach(tenant => {
          tenantsMap.set(tenant.id, tenant)
        })
      }

      // Combinar users com tenants
      const usersWithTenants: UserProfile[] = userProfiles?.map(profile => ({
        ...profile,
        tenants: profile.tenant_id ? tenantsMap.get(profile.tenant_id) : null
      })) || []

      setUsers(usersWithTenants)
      setLoading(false)
    }

    loadUsers()
  }, [currentUserRole, currentUserTenantId])

  // Calculate stats
  const totalUsers = users?.length || 0
  const superAdmins = users?.filter(u => u.role === 'superadmin').length || 0
  const admins = users?.filter(u => u.role === 'admin').length || 0
  const regularUsers = users?.filter(u => u.role === 'user').length || 0
  const activeUsers = users?.filter(u => u.is_active).length || 0

  const getRoleBadge = (role: string) => {
    const variants = {
      superadmin: 'destructive',
      admin: 'default',
      user: 'secondary',
      viewer: 'outline',
    } as const

    const labels = {
      superadmin: 'Super Admin',
      admin: 'Admin',
      user: 'Usuário',
      viewer: 'Visualizador',
    } as const

    return (
      <Badge variant={variants[role as keyof typeof variants] || 'secondary'} className="text-xs">
        {labels[role as keyof typeof labels] || role}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">
          Carregando...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card className="card-elevated border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Total de Usuários</CardTitle>
            <Users className="h-3.5 w-3.5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-primary">{totalUsers}</div>
            <p className="text-[10px] text-muted-foreground">
              {activeUsers} ativos
            </p>
          </CardContent>
        </Card>

        {currentUserRole === 'superadmin' && (
          <Card className="card-elevated border-destructive/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium">Super Admins</CardTitle>
              <Shield className="h-3.5 w-3.5 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-destructive">{superAdmins}</div>
              <p className="text-[10px] text-muted-foreground">
                Acesso total
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Admins</CardTitle>
            <Shield className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{admins}</div>
            <p className="text-[10px] text-muted-foreground">
              Gestores da empresa
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Usuários</CardTitle>
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{regularUsers}</div>
            <p className="text-[10px] text-muted-foreground">
              Acesso completo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="text-base">Lista de Usuários</CardTitle>
          <CardDescription className="text-xs">
            {currentUserRole === 'superadmin'
              ? 'Todos os usuários do sistema'
              : 'Usuários da sua empresa (superadmins não são exibidos)'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {users && users.length > 0 ? (
              users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 border border-border rounded-xl hover:bg-accent/50 hover:border-primary/50 transition-all duration-300"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 ring-1 ring-primary/20">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm">{user.full_name}</h3>
                        {getRoleBadge(user.role)}
                        {!user.is_active && (
                          <Badge variant="outline" className="gap-1 border-destructive/50 text-destructive text-xs">
                            <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
                            Inativo
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs">
                        {user.tenants && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            <span className="font-medium">Empresa:</span> {user.tenants.name}
                          </span>
                        )}
                        {!user.tenants && user.role === 'superadmin' && (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <Shield className="h-2.5 w-2.5" />
                            Todas as empresas
                          </Badge>
                        )}
                        {!user.tenants && user.role !== 'superadmin' && (
                          <span className="text-muted-foreground text-[10px]">Sem empresa</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/usuarios/${user.id}/editar`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:border-destructive" disabled>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Users className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <h3 className="mt-3 text-sm font-semibold">Nenhum usuário cadastrado</h3>
                <p className="text-muted-foreground text-xs mt-2">
                  Comece adicionando usuários ao sistema
                </p>
                <Button asChild size="sm" className="mt-3">
                  <Link href="/usuarios/novo">
                    <UserPlus className="mr-2 h-3.5 w-3.5" />
                    Adicionar Usuário
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
