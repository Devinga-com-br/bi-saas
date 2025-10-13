import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Building2, ArrowLeft, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { BranchManager } from '@/components/branches/branch-manager'
import type { Tenant } from '@/types'

export default async function EmpresaDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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

  // Get tenant details
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', id)
    .single() as { data: Tenant | null; error: Error | null }

  if (error || !tenant) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Empresas', href: '/empresas' },
          { label: tenant.name },
        ]}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/empresas">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 ring-1 ring-primary/20">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight">{tenant.name}</h1>
                {tenant.is_active ? (
                  <Badge variant="outline" className="gap-1 border-primary/50 text-primary">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    Ativa
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 border-destructive/50 text-destructive">
                    <div className="h-2 w-2 rounded-full bg-destructive" />
                    Inativa
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground mt-1.5">
                Detalhes e gerenciamento da empresa
              </p>
            </div>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/empresas/${tenant.id}/editar`}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Link>
        </Button>
      </div>

      {/* Company Info */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Informações da Empresa</CardTitle>
          <CardDescription>Dados cadastrais da empresa</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tenant.cnpj && (
              <div>
                <dt className="text-sm font-medium text-muted-foreground">CNPJ</dt>
                <dd className="mt-1 text-sm">{tenant.cnpj}</dd>
              </div>
            )}
            {tenant.phone && (
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Telefone</dt>
                <dd className="mt-1 text-sm">{tenant.phone}</dd>
              </div>
            )}
            {tenant.address && (
              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-muted-foreground">Endereço</dt>
                <dd className="mt-1 text-sm">{tenant.address}</dd>
              </div>
            )}
            {tenant.supabase_schema && (
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Schema do Banco</dt>
                <dd className="mt-1">
                  <code className="text-xs bg-secondary text-muted-foreground px-2 py-1 rounded border border-border">
                    {tenant.supabase_schema}
                  </code>
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Data de Criação</dt>
              <dd className="mt-1 text-sm">
                {new Date(tenant.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Branch Manager */}
      <BranchManager tenantId={tenant.id} />
    </div>
  )
}
