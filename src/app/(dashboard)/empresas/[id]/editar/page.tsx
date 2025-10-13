import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CompanyForm } from '@/components/companies/company-form'
import type { Tenant } from '@/types'

export default async function EditarEmpresaPage({
  params,
}: {
  params: { id: string }
}) {
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

  // Get company data
  const { data: company, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', params.id)
    .single() as { data: Tenant | null; error: Error | null }

  if (error || !company) {
    redirect('/empresas')
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/empresas">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editar Empresa</h1>
          <p className="text-muted-foreground mt-2">
            Atualize as informações de {company.name}
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Dados da Empresa</CardTitle>
          <CardDescription>
            Altere as informações da empresa. Campos marcados com * são obrigatórios.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CompanyForm company={company} mode="edit" />
        </CardContent>
      </Card>
    </div>
  )
}
