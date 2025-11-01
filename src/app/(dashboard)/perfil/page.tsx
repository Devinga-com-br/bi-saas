import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ProfileForm } from '@/components/profile/profile-form'
import { PasswordForm } from '@/components/profile/password-form'
import { User, Mail, Building2, Shield } from 'lucide-react'
import type { UserWithTenant, UserProfile } from '@/types'
import { RoleLabels } from '@/types'
import { PageBreadcrumb } from '@/components/dashboard/page-breadcrumb'

export default async function PerfilPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Buscar perfil do usuário
  const { data: userProfile } = (await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()) as { data: UserProfile | null }

  if (!userProfile) {
    redirect('/login')
  }

  // Buscar tenant se o usuário tiver um
  let tenant = null
  if (userProfile.tenant_id) {
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', userProfile.tenant_id)
      .single()

    tenant = tenantData
  }

  const profile = {
    ...userProfile,
    tenant,
  } as UserWithTenant

  const initials = profile.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??'

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <PageBreadcrumb />

      {/* Profile Overview */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
              <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <div>
                <h2 className="text-2xl font-bold">{profile.full_name}</h2>
                <p className="text-muted-foreground">{user.email}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="default" className="gap-1">
                  <Shield className="h-3 w-3" />
                  {RoleLabels[profile.role] || profile.role}
                </Badge>
                {profile.tenant && (
                  <Badge variant="secondary" className="gap-1">
                    <Building2 className="h-3 w-3" />
                    {profile.tenant.name}
                  </Badge>
                )}
                {!profile.tenant && profile.role === 'superadmin' && (
                  <Badge variant="secondary" className="gap-1">
                    <Building2 className="h-3 w-3" />
                    Todas as empresas
                  </Badge>
                )}
                {profile.is_active ? (
                  <Badge variant="outline" className="gap-1 border-green-500 text-green-600">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    Ativo
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 border-red-500 text-red-600">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    Inativo
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Informações Pessoais */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Informações Pessoais</CardTitle>
                <CardDescription>
                  Atualize seu nome e informações de perfil
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ProfileForm currentName={profile.full_name} userId={user.id} />
          </CardContent>
        </Card>

        {/* Segurança */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Segurança</CardTitle>
                <CardDescription>
                  Altere sua senha para manter sua conta segura
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <PasswordForm />
          </CardContent>
        </Card>
      </div>

      {/* Account Information Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold truncate" title={user.email}>
              {user.email}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Endereço de email verificado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Função</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {RoleLabels[profile.role] || profile.role}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Nível de acesso no sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organização</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {profile.tenant?.name || (profile.role === 'superadmin' ? 'Todas as empresas' : 'Não definido')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {profile.role === 'superadmin' ? 'Acesso global' : 'Sua empresa ou equipe'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status da Conta</CardTitle>
            <div className={`h-2 w-2 rounded-full ${profile.is_active ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-lg font-semibold ${profile.is_active ? 'text-green-600' : 'text-red-600'}`}>
              {profile.is_active ? 'Ativo' : 'Inativo'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {profile.is_active ? 'Conta totalmente operacional' : 'Conta desativada'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
