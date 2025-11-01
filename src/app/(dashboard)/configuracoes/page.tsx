'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTenantContext } from '@/contexts/tenant-context'
import { logModuleAccess } from '@/lib/audit'
import { createClient } from '@/lib/supabase/client'
import { PageBreadcrumb } from '@/components/dashboard/page-breadcrumb'
import { PerfilContent } from '@/components/configuracoes/perfil-content'
import { UsuariosContent } from '@/components/configuracoes/usuarios-content'
import { SetoresContent } from '@/components/configuracoes/setores-content'
import { EmpresasContent } from '@/components/configuracoes/empresas-content'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  UserCircle,
  UserCog,
  Settings,
  Building2,
  Cog,
  UserPlus,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import type { UserWithTenant, UserProfile } from '@/types'

const menuItems = [
  { id: 'perfil', label: 'Perfil', icon: UserCircle, description: 'Gerencie suas informações pessoais e preferências' },
  { id: 'usuarios', label: 'Usuários', icon: UserCog, requiresAdminOrAbove: true, description: 'Gerencie os usuários do sistema' },
  { id: 'setores', label: 'Setores', icon: Settings, requiresAdminOrAbove: true, description: 'Configure os setores para acompanhamento de metas' },
  { id: 'empresas', label: 'Empresas', icon: Building2, requiresSuperAdmin: true, description: 'Gerencie as empresas do sistema' },
]

export default function ConfiguracoesPage() {
  const { currentTenant, userProfile } = useTenantContext()
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<string>('perfil')
  const [profileData, setProfileData] = useState<{
    profile: UserWithTenant | null
    userEmail: string
    userId: string
  }>({
    profile: null,
    userEmail: '',
    userId: ''
  })

  const isSuperAdmin = userProfile?.role === 'superadmin'
  const isAdminOrAbove = ['superadmin', 'admin'].includes(userProfile?.role || '')

  useEffect(() => {
    const logAccess = async () => {
      if (currentTenant && userProfile) {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        logModuleAccess({
          module: 'configuracoes',
          tenantId: currentTenant.id,
          userName: userProfile.full_name,
          userEmail: user?.email || ''
        })
      }
    }
    logAccess()
  }, [currentTenant, userProfile])

  // Load profile data
  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      const { data: userProfileData } = (await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()) as { data: UserProfile | null }

      if (!userProfileData) return

      let tenant = null
      if (userProfileData.tenant_id) {
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', userProfileData.tenant_id)
          .single()

        tenant = tenantData
      }

      const profile = {
        ...userProfileData,
        tenant,
      } as UserWithTenant

      setProfileData({
        profile,
        userEmail: user.email || '',
        userId: user.id
      })
    }

    loadProfile()
  }, [])

  const handleMenuClick = (item: typeof menuItems[0]) => {
    setActiveSection(item.id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageBreadcrumb />
        {activeSection === 'usuarios' && isAdminOrAbove && (
          <Button asChild size="sm">
            <Link href="/usuarios/novo">
              <UserPlus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Link>
          </Button>
        )}
        {activeSection === 'setores' && isAdminOrAbove && (
          <Button onClick={() => {
            // Trigger dialog open in SetoresContent
            const event = new CustomEvent('openSetorDialog')
            window.dispatchEvent(event)
          }} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Novo Setor
          </Button>
        )}
        {activeSection === 'empresas' && isSuperAdmin && (
          <Button asChild size="sm">
            <Link href="/empresas/nova">
              <Plus className="mr-2 h-4 w-4" />
              Nova Empresa
            </Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Sidebar Menu */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Cog className="h-5 w-5" />
              Configurações
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <nav className="flex flex-col">
              {menuItems.map((item) => {
                // Check permissions
                if (item.requiresSuperAdmin && !isSuperAdmin) return null
                if (item.requiresAdminOrAbove && !isAdminOrAbove) return null

                const Icon = item.icon
                const isActive = activeSection === item.id

                return (
                  <button
                    key={item.id}
                    onClick={() => handleMenuClick(item)}
                    className={cn(
                      'flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors border-l-2',
                      isActive
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-transparent hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                )
              })}
            </nav>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="space-y-4">
          {activeSection === 'perfil' && profileData.profile && (
            <PerfilContent
              profile={profileData.profile}
              userEmail={profileData.userEmail}
              userId={profileData.userId}
            />
          )}

          {activeSection === 'usuarios' && isAdminOrAbove && userProfile && (
            <UsuariosContent
              currentUserRole={userProfile.role}
              currentUserTenantId={userProfile.tenant_id}
            />
          )}

          {activeSection === 'setores' && isAdminOrAbove && currentTenant && (
            <SetoresContent tenantSchema={currentTenant.supabase_schema} />
          )}

          {activeSection === 'empresas' && isSuperAdmin && (
            <EmpresasContent />
          )}
        </div>
      </div>
    </div>
  )
}
