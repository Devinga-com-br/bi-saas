'use client'

import { useRouter } from 'next/navigation'
import { Building2, Edit, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Tenant } from '@/types'

interface TenantCardProps {
  tenant: Tenant & { user_count: number }
}

export function TenantCard({ tenant }: TenantCardProps) {
  const router = useRouter()

  const handleCardClick = () => {
    router.push(`/empresas/${tenant.id}`)
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/empresas/${tenant.id}/editar`)
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    // TODO: Implementar função de deletar
    alert('Funcionalidade de deletar será implementada em breve')
  }

  return (
    <div
      onClick={handleCardClick}
      className="flex items-center justify-between p-4 border border-border rounded-2xl hover:bg-accent/50 hover:border-primary/50 transition-all duration-300 cursor-pointer group"
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
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleEditClick}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive hover:border-destructive"
          onClick={handleDeleteClick}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
