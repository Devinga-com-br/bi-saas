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
  const [switching, setSwitching] = React.useState(false)
  const { currentTenant, accessibleTenants, loading, switchTenant } = useTenantContext()
  const isSuperAdmin = useIsSuperAdmin()

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-2 py-2 text-sm">
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
      <div className="flex items-center gap-2 px-2 py-2">
        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Building2 className="h-4 w-4" />
        </div>
        <span className="text-sm font-medium truncate flex-1">{currentTenant.name}</span>
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
          className="w-full justify-between h-auto py-2 px-2"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shrink-0">
              <Building2 className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium truncate">{currentTenant.name}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <Badge variant="secondary" className="text-xs">
              {accessibleTenants.length}
            </Badge>
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar empresa..." />
          <CommandList>
            <CommandEmpty>Nenhuma empresa encontrada.</CommandEmpty>
            <CommandGroup heading="Empresas Acessíveis">
              {accessibleTenants.map((tenant) => (
                <CommandItem
                  key={tenant.id}
                  value={tenant.name}
                  disabled={switching}
                  onSelect={async () => {
                    if (tenant.id === currentTenant.id) {
                      setOpen(false)
                      return
                    }
                    
                    setSwitching(true)
                    setOpen(false)
                    await switchTenant(tenant.id)
                    // O switchTenant já faz o redirect, então não precisa setSwitching(false)
                  }}
                >
                  {switching && tenant.id !== currentTenant.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        currentTenant.id === tenant.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                  )}
                  <span className="font-medium">{tenant.name}</span>
                  {tenant.id === currentTenant.id && (
                    <Badge variant="secondary" className="ml-auto text-xs">Atual</Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
