import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { UserPlus, Users, Shield, Pencil, Trash2, Building2 } from 'lucide-react'
import type { Database } from '@/types/database.types'
import type { UserProfile as UP } from '@/types'

type UserProfile = UP & {
  tenants?: Database['public']['Tables']['tenants']['Row'] | null
}

export default async function UsersPage() {
  const supabase = await createClient()

  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get current user profile with role
  const { data: currentProfile } = await supabase
    .from('user_profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single() as { data: { role: string; tenant_id: string } | null }

  if (!currentProfile) {
    redirect('/dashboard')
  }

  // Only superadmin and admin can access user management
  if (!['superadmin', 'admin'].includes(currentProfile.role)) {
    redirect('/dashboard')
  }

  // Get users based on role
  let usersQuery = supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false })

  // If admin, only show users from their tenant AND exclude superadmins
  if (currentProfile.role === 'admin') {
    usersQuery = usersQuery
      .eq('tenant_id', currentProfile.tenant_id)
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
  const users: UserProfile[] = userProfiles?.map(profile => ({
    ...profile,
    tenants: profile.tenant_id ? tenantsMap.get(profile.tenant_id) : null
  })) || []

  // Calculate stats
  const totalUsers = users?.length || 0
  const superAdmins = users?.filter(u => u.role === 'superadmin').length || 0
  const admins = users?.filter(u => u.role === 'admin').length || 0
  const regularUsers = users?.filter(u => u.role === 'user').length || 0
  const viewers = users?.filter(u => u.role === 'viewer').length || 0
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
      <Badge variant={variants[role as keyof typeof variants] || 'secondary'}>
        {labels[role as keyof typeof labels] || role}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[{ label: 'Usuários' }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
            <p className="text-muted-foreground mt-1.5">
              Gerencie os usuários cadastrados no sistema
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href="/usuarios/novo">
            <UserPlus className="mr-2 h-4 w-4" />
            Novo Usuário
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="card-elevated border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {activeUsers} ativos
            </p>
          </CardContent>
        </Card>

        {currentProfile.role === 'superadmin' && (
          <Card className="card-elevated border-destructive/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Super Admins</CardTitle>
              <Shield className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{superAdmins}</div>
              <p className="text-xs text-muted-foreground">
                Acesso total
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{admins}</div>
            <p className="text-xs text-muted-foreground">
              Gestores da empresa
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{regularUsers}</div>
            <p className="text-xs text-muted-foreground">
              Acesso completo
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visualizadores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{viewers}</div>
            <p className="text-xs text-muted-foreground">
              Somente leitura
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
          <CardDescription>
            {currentProfile.role === 'superadmin'
              ? 'Todos os usuários do sistema'
              : 'Usuários da sua empresa (superadmins não são exibidos)'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users && users.length > 0 ? (
              users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border border-border rounded-2xl hover:bg-accent/50 hover:border-primary/50 transition-all duration-300"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 ring-1 ring-primary/20">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{user.full_name}</h3>
                        {getRoleBadge(user.role)}
                        {!user.is_active && (
                          <Badge variant="outline" className="gap-1 border-destructive/50 text-destructive">
                            <div className="h-2 w-2 rounded-full bg-destructive" />
                            Inativo
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        {user.tenants && (
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Building2 className="h-3.5 w-3.5" />
                            <span className="font-medium">Empresa:</span> {user.tenants.name}
                          </span>
                        )}
                        {!user.tenants && user.role === 'superadmin' && (
                          <Badge variant="secondary" className="gap-1.5">
                            <Shield className="h-3 w-3" />
                            Todas as empresas
                          </Badge>
                        )}
                        {!user.tenants && user.role !== 'superadmin' && (
                          <span className="text-muted-foreground text-xs">Sem empresa</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/usuarios/${user.id}/editar`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:border-destructive" disabled>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">Nenhum usuário cadastrado</h3>
                <p className="text-muted-foreground mt-2">
                  Comece adicionando usuários ao sistema
                </p>
                <Button asChild className="mt-4">
                  <Link href="/usuarios/novo">
                    <UserPlus className="mr-2 h-4 w-4" />
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
