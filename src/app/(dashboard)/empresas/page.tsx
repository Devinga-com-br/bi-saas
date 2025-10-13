import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Building2, Plus, Edit, Trash2, Users } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import type { Tenant } from '@/types'

export default async function EmpresasPage() {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is superadmin
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || profile.role !== 'superadmin') {
    redirect('/dashboard')
  }

  // Get all tenants with user count
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select(`
      *,
      user_profiles(count)
    `)
    .order('created_at', { ascending: false }) as { data: (Tenant & { user_profiles: { count: number }[] })[] | null; error: Error | null }

  if (error) {
    console.error('Error fetching tenants:', error)
  }

  // Transform data to include user count
  const tenantsWithCount = tenants?.map(tenant => ({
    ...tenant,
    user_count: tenant.user_profiles?.[0]?.count || 0
  }))

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[{ label: 'Empresas' }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Empresas</h1>
            <p className="text-muted-foreground mt-1.5">
              Gerencie as empresas cadastradas no sistema
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href="/empresas/nova">
            <Plus className="mr-2 h-4 w-4" />
            Nova Empresa
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Empresas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenantsWithCount?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Cadastradas no sistema
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empresas Ativas</CardTitle>
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {tenantsWithCount?.filter((t) => t.is_active).length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Em operação
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empresas Inativas</CardTitle>
            <div className="h-2 w-2 rounded-full bg-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {tenantsWithCount?.filter((t) => !t.is_active).length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Desativadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Companies List */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Lista de Empresas</CardTitle>
          <CardDescription>
            Todas as empresas cadastradas no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!tenantsWithCount || tenantsWithCount.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Nenhuma empresa cadastrada</h3>
              <p className="text-muted-foreground mt-2">
                Comece cadastrando sua primeira empresa
              </p>
              <Button asChild className="mt-4">
                <Link href="/empresas/nova">
                  <Plus className="mr-2 h-4 w-4" />
                  Cadastrar Empresa
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {tenantsWithCount.map((tenant) => (
                <Link
                  key={tenant.id}
                  href={`/empresas/${tenant.id}`}
                  className="flex items-center justify-between p-4 border border-border rounded-2xl hover:bg-accent/50 hover:border-primary/50 transition-all duration-300 group"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 ring-1 ring-primary/20">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{tenant.name}</h3>
                        {tenant.is_active ? (
                          <Badge variant="outline" className="gap-1 border-primary/50 text-primary">
                            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 border-destructive/50 text-destructive">
                            <div className="h-2 w-2 rounded-full bg-destructive" />
                            Inativo
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        {tenant.cnpj && (
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="font-medium">CNPJ:</span> {tenant.cnpj}
                          </span>
                        )}
                        {tenant.phone && (
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="font-medium">Tel:</span> {tenant.phone}
                          </span>
                        )}
                        <Badge variant="secondary" className="gap-1.5 font-normal">
                          <Users className="h-3 w-3" />
                          {tenant.user_count} {tenant.user_count === 1 ? 'usuário' : 'usuários'}
                        </Badge>
                      </div>
                      {tenant.supabase_schema && (
                        <div className="mt-2">
                          <span className="font-mono text-xs bg-secondary text-muted-foreground px-2 py-1 rounded border border-border">
                            Schema: {tenant.supabase_schema}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pointer-events-none">
                    <Button variant="outline" size="sm" asChild className="pointer-events-auto">
                      <Link href={`/empresas/${tenant.id}/editar`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:border-destructive pointer-events-auto">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
