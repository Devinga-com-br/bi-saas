'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Building2, Plus, Edit, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import type { Tenant } from '@/types'

interface TenantWithCount extends Tenant {
  user_count: number
}

export function EmpresasContent() {
  const router = useRouter()
  const [tenants, setTenants] = useState<TenantWithCount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadTenants = async () => {
      const supabase = createClient()

      const { data: tenantsData, error } = await supabase
        .from('tenants')
        .select(`
          *,
          user_profiles(count)
        `)
        .order('created_at', { ascending: false }) as { data: (Tenant & { user_profiles: { count: number }[] })[] | null; error: Error | null }

      if (error) {
        console.error('Error fetching tenants:', error)
      }

      const tenantsWithCount = tenantsData?.map(tenant => ({
        ...tenant,
        user_count: tenant.user_profiles?.[0]?.count || 0
      })) || []

      setTenants(tenantsWithCount)
      setLoading(false)
    }

    loadTenants()
  }, [])

  const handleEditClick = (e: React.MouseEvent, tenantId: string) => {
    e.stopPropagation()
    e.preventDefault()
    router.push(`/empresas/${tenantId}/editar`)
  }

  const handleDeleteClick = (e: React.MouseEvent, tenantId: string) => {
    e.stopPropagation()
    e.preventDefault()
    // TODO: Implement delete functionality
    console.log('Delete tenant', tenantId)
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
      {/* Stats */}
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Total de Empresas</CardTitle>
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{tenants?.length || 0}</div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Cadastradas no sistema
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Empresas Ativas</CardTitle>
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-primary">
              {tenants?.filter((t) => t.is_active).length || 0}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Em operação
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Empresas Inativas</CardTitle>
            <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-destructive">
              {tenants?.filter((t) => !t.is_active).length || 0}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Desativadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Companies List */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="text-base">Lista de Empresas</CardTitle>
          <CardDescription className="text-xs">
            Todas as empresas cadastradas no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!tenants || tenants.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <h3 className="mt-3 text-sm font-semibold">Nenhuma empresa cadastrada</h3>
              <p className="text-muted-foreground text-xs mt-2">
                Comece cadastrando sua primeira empresa
              </p>
              <Button asChild size="sm" className="mt-3">
                <Link href="/empresas/nova">
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Cadastrar Empresa
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {tenants.map((tenant) => (
                <Link
                  key={tenant.id}
                  href={`/empresas/${tenant.id}`}
                  className="flex items-center justify-between p-3 border border-border rounded-xl hover:bg-accent/50 hover:border-primary/50 transition-all duration-300 group"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 ring-1 ring-primary/20">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm">{tenant.name}</h3>
                        {tenant.is_active ? (
                          <Badge variant="outline" className="gap-1 border-primary/50 text-primary text-xs">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 border-destructive/50 text-destructive text-xs">
                            <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
                            Inativo
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs">
                        {tenant.cnpj && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <span className="font-medium">CNPJ:</span> {tenant.cnpj}
                          </span>
                        )}
                        {tenant.phone && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <span className="font-medium">Tel:</span> {tenant.phone}
                          </span>
                        )}
                        <Badge variant="secondary" className="gap-1 font-normal text-xs">
                          <Users className="h-2.5 w-2.5" />
                          {tenant.user_count} {tenant.user_count === 1 ? 'usuário' : 'usuários'}
                        </Badge>
                      </div>
                      {tenant.supabase_schema && (
                        <div className="mt-1">
                          <span className="font-mono text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded border border-border">
                            Schema: {tenant.supabase_schema}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleEditClick(e, tenant.id)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:border-destructive"
                      onClick={(e) => handleDeleteClick(e, tenant.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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
