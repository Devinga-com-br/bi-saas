import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserForm } from '@/components/users/user-form'

export default async function NewUserPage() {
  const supabase = await createClient()

  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get current user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single() as { data: { role: string; tenant_id: string | null } | null }

  if (!profile) {
    redirect('/dashboard')
  }

  // Only superadmin and admin can create users
  if (!['superadmin', 'admin'].includes(profile.role)) {
    redirect('/dashboard')
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Novo Usuário</h2>
        <p className="text-muted-foreground">
          Cadastre um novo usuário no sistema
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Dados do Usuário</CardTitle>
          <CardDescription>
            Preencha os dados do novo usuário. Todos os campos marcados com * são obrigatórios.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserForm
            currentUserRole={profile.role}
            currentUserTenantId={profile.tenant_id}
          />
        </CardContent>
      </Card>
    </div>
  )
}
