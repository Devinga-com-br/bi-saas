'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Building2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { useTenantContext } from '@/contexts/tenant-context'
import { useIsSuperAdmin } from '@/hooks/use-permissions'

export function CompanySwitcher() {
  const [open, setOpen] = React.useState(false)
  const { currentTenant, accessibleTenants, loading, switchTenant } = useTenantContext()
  const isSuperAdmin = useIsSuperAdmin()

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-muted-foreground">Carregando...</span>
      </div>
    )
  }

  if (!currentTenant) {
    return null
  }

  // Se não for superadmin, mostrar badge fixo
  if (!isSuperAdmin) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <div className="flex flex-col">
          <span className="text-sm font-medium">{currentTenant.name}</span>
          {currentTenant.cnpj && (
            <span className="text-xs text-muted-foreground">
              CNPJ: {currentTenant.cnpj}
            </span>
          )}
        </div>
      </div>
    )
  }

  // Superadmin: mostrar selector com todas as empresas acessíveis
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[280px] justify-between"
        >
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">{currentTenant.name}</span>
              {currentTenant.cnpj && (
                <span className="text-xs text-muted-foreground">
                  {currentTenant.cnpj}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className="text-xs">
              {accessibleTenants.length}
            </Badge>
            <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0">
        <Command>
          <CommandInput placeholder="Buscar empresa..." />
          <CommandList>
            <CommandEmpty>Nenhuma empresa encontrada.</CommandEmpty>
            <CommandGroup heading="Empresas Acessíveis">
              {accessibleTenants.map((tenant) => (
                <CommandItem
                  key={tenant.id}
                  value={tenant.name}
                  onSelect={() => {
                    switchTenant(tenant.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      currentTenant.id === tenant.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{tenant.name}</span>
                    {tenant.cnpj && (
                      <span className="text-xs text-muted-foreground">
                        CNPJ: {tenant.cnpj}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
