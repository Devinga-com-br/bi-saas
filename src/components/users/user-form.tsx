'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import type { Database } from '@/types/database.types'

type UserProfile = Database['public']['Tables']['user_profiles']['Row']
type Tenant = Database['public']['Tables']['tenants']['Row']

interface UserFormProps {
  user?: UserProfile
  currentUserRole: string
  currentUserTenantId: string | null
}

export function UserForm({ user, currentUserRole, currentUserTenantId }: UserFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tenants, setTenants] = useState<Tenant[]>([])

  // Form fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [role, setRole] = useState<string>(user?.role || 'user')
  const [tenantId, setTenantId] = useState(user?.tenant_id || currentUserTenantId || '')
  const [isActive, setIsActive] = useState(user?.is_active ?? true)

  // Quando role é superadmin, tenant_id deve ser null
  const shouldShowTenantField = role !== 'superadmin'

  // Load tenants based on current user role
  useEffect(() => {
    async function loadTenants() {
      if (currentUserRole === 'superadmin') {
        // Superadmin can see all tenants
        const { data } = await supabase
          .from('tenants')
          .select('*')
          .eq('is_active', true)
          .order('name')

        if (data) {
          setTenants(data)
        }
      } else if (currentUserRole === 'admin' && currentUserTenantId) {
        // Admin only sees their own tenant
        const { data } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', currentUserTenantId)
          .single()

        if (data) {
          setTenants([data])
        }
      }
    }

    loadTenants()
  }, [currentUserRole, currentUserTenantId, supabase])

  // Get available roles based on current user role
  const getAvailableRoles = () => {
    if (currentUserRole === 'superadmin') {
      return [
        { value: 'superadmin', label: 'Super Admin' },
        { value: 'admin', label: 'Admin' },
        { value: 'user', label: 'Usuário' },
        { value: 'viewer', label: 'Visualizador' },
      ]
    } else if (currentUserRole === 'admin') {
      return [
        { value: 'admin', label: 'Admin' },
        { value: 'user', label: 'Usuário' },
        { value: 'viewer', label: 'Visualizador' },
      ]
    }
    return []
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!user) {
        // Creating new user
        if (!email || !password) {
          setError('Email e senha são obrigatórios')
          setLoading(false)
          return
        }

        if (password.length < 6) {
          setError('A senha deve ter no mínimo 6 caracteres')
          setLoading(false)
          return
        }

        if (!fullName.trim()) {
          setError('Nome completo é obrigatório')
          setLoading(false)
          return
        }

        // Call API route to create user (requires admin API)
        const response = await fetch('/api/users/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
            full_name: fullName.trim(),
            role,
            tenant_id: role === 'superadmin' ? null : tenantId,
            is_active: isActive,
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          setError(result.error || 'Erro ao criar usuário')
          setLoading(false)
          return
        }

        router.push('/usuarios')
        router.refresh()
      } else {
        // Updating existing user
        if (!fullName.trim()) {
          setError('Nome completo é obrigatório')
          setLoading(false)
          return
        }

        const updateData: Record<string, string | boolean | null> = {
          full_name: fullName.trim(),
          role,
          tenant_id: role === 'superadmin' ? null : tenantId,
          is_active: isActive,
        }

        const { error: updateError } = await supabase
          .from('user_profiles')
          // @ts-expect-error - Supabase type inference limitation
          .update(updateData)
          .eq('id', user.id)

        if (updateError) {
          setError(updateError.message)
          setLoading(false)
          return
        }

        router.push('/usuarios')
        router.refresh()
      }
    } catch {
      setError('Erro inesperado ao salvar usuário')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!user && (
        <>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="usuario@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha *</Label>
            <Input
              id="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              A senha deve ter no mínimo 6 caracteres
            </p>
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="fullName">Nome Completo *</Label>
        <Input
          id="fullName"
          type="text"
          placeholder="Nome completo do usuário"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          disabled={loading}
        />
      </div>

      {shouldShowTenantField && (
        <div className="space-y-2">
          <Label htmlFor="tenant">Empresa *</Label>
          <Select value={tenantId} onValueChange={setTenantId} disabled={loading || currentUserRole === 'admin'}>
            <SelectTrigger id="tenant">
              <SelectValue placeholder="Selecione a empresa" />
            </SelectTrigger>
            <SelectContent>
              {tenants.map((tenant) => (
                <SelectItem key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {currentUserRole === 'admin' && (
            <p className="text-xs text-muted-foreground">
              Como admin, você só pode criar usuários na sua empresa
            </p>
          )}
        </div>
      )}

      {!shouldShowTenantField && (
        <Alert>
          <AlertDescription>
            Superadmins não são vinculados a uma empresa específica e têm acesso a todas as empresas do sistema.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="role">Perfil *</Label>
        <Select value={role} onValueChange={setRole} disabled={loading}>
          <SelectTrigger id="role">
            <SelectValue placeholder="Selecione o perfil" />
          </SelectTrigger>
          <SelectContent>
            {getAvailableRoles().map((roleOption) => (
              <SelectItem key={roleOption.value} value={roleOption.value}>
                {roleOption.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {currentUserRole === 'admin'
            ? 'Como admin, você pode criar outros admins, usuários e visualizadores'
            : 'Como superadmin, você pode criar qualquer tipo de usuário'}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          value={isActive ? 'active' : 'inactive'}
          onValueChange={(value) => setIsActive(value === 'active')}
          disabled={loading}
        >
          <SelectTrigger id="status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {user ? 'Atualizar Usuário' : 'Criar Usuário'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
