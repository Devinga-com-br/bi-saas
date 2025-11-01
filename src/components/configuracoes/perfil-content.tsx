'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ProfileForm } from '@/components/profile/profile-form'
import { PasswordForm } from '@/components/profile/password-form'
import { User, Mail, Building2, Shield } from 'lucide-react'
import type { UserWithTenant } from '@/types'
import { RoleLabels } from '@/types'

interface PerfilContentProps {
  profile: UserWithTenant
  userEmail: string
  userId: string
}

export function PerfilContent({ profile, userEmail, userId }: PerfilContentProps) {
  const initials = profile.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??'

  return (
    <div className="space-y-6">
      {/* Profile Overview */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <Avatar className="h-16 w-16 border-2 border-background shadow">
              <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <div>
                <h2 className="text-xl font-bold">{profile.full_name}</h2>
                <p className="text-sm text-muted-foreground">{userEmail}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="default" className="gap-1 text-xs">
                  <Shield className="h-3 w-3" />
                  {RoleLabels[profile.role] || profile.role}
                </Badge>
                {profile.tenant && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Building2 className="h-3 w-3" />
                    {profile.tenant.name}
                  </Badge>
                )}
                {!profile.tenant && profile.role === 'superadmin' && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Building2 className="h-3 w-3" />
                    Todas as empresas
                  </Badge>
                )}
                {profile.is_active ? (
                  <Badge variant="outline" className="gap-1 border-green-500 text-green-600 text-xs">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    Ativo
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 border-red-500 text-red-600 text-xs">
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
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Informações Pessoais */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <div>
                <CardTitle className="text-base">Informações Pessoais</CardTitle>
                <CardDescription className="text-xs">
                  Atualize seu nome e informações de perfil
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ProfileForm currentName={profile.full_name} userId={userId} />
          </CardContent>
        </Card>

        {/* Segurança */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <div>
                <CardTitle className="text-base">Segurança</CardTitle>
                <CardDescription className="text-xs">
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
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Email</CardTitle>
            <Mail className="h-3 w-3 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold truncate" title={userEmail}>
              {userEmail}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Email verificado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Função</CardTitle>
            <Shield className="h-3 w-3 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold">
              {RoleLabels[profile.role] || profile.role}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Nível de acesso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Organização</CardTitle>
            <Building2 className="h-3 w-3 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold truncate">
              {profile.tenant?.name || (profile.role === 'superadmin' ? 'Todas' : 'N/D')}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {profile.role === 'superadmin' ? 'Acesso global' : 'Sua empresa'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Status</CardTitle>
            <div className={`h-2 w-2 rounded-full ${profile.is_active ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-sm font-semibold ${profile.is_active ? 'text-green-600' : 'text-red-600'}`}>
              {profile.is_active ? 'Ativo' : 'Inativo'}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {profile.is_active ? 'Operacional' : 'Desativada'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
