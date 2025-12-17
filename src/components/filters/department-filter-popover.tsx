'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface Departamento {
  id: number
  departamento_id: number
  descricao: string
}

interface DepartmentFilterPopoverProps {
  departamentos: Departamento[]
  selectedIds: number[]
  onChange: (ids: number[]) => void
  disabled?: boolean
  loading?: boolean
}

export function DepartmentFilterPopover({
  departamentos,
  selectedIds,
  onChange,
  disabled = false,
  loading = false,
}: DepartmentFilterPopoverProps) {
  const [open, setOpen] = React.useState(false)

  const allSelected = selectedIds.length === departamentos.length && departamentos.length > 0
  const noneSelected = selectedIds.length === 0

  const handleSelectAll = () => {
    onChange(departamentos.map((d) => d.departamento_id))
  }

  const handleDeselectAll = () => {
    onChange([])
  }

  const handleToggle = (deptId: number) => {
    if (selectedIds.includes(deptId)) {
      onChange(selectedIds.filter((id) => id !== deptId))
    } else {
      onChange([...selectedIds, deptId])
    }
  }

  const getButtonLabel = () => {
    if (loading) return 'Carregando...'
    if (departamentos.length === 0) return 'Nenhum departamento'
    if (allSelected || noneSelected) return 'Todos os Departamentos'
    if (selectedIds.length === 1) {
      const dept = departamentos.find((d) => d.departamento_id === selectedIds[0])
      return dept?.descricao || '1 selecionado'
    }
    return `${selectedIds.length} selecionados`
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className="h-10 justify-between w-full"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Filter className="h-4 w-4 shrink-0" />
            <span className="truncate">{getButtonLabel()}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar departamento..." />
          <CommandList>
            <CommandEmpty>Nenhum departamento encontrado.</CommandEmpty>

            {/* Ações rápidas */}
            <CommandGroup>
              <CommandItem onSelect={handleSelectAll}>
                <Check
                  className={cn('mr-2 h-4 w-4', allSelected ? 'opacity-100' : 'opacity-0')}
                />
                Marcar todos
              </CommandItem>
              <CommandItem onSelect={handleDeselectAll}>
                <Check
                  className={cn('mr-2 h-4 w-4', noneSelected ? 'opacity-100' : 'opacity-0')}
                />
                Desmarcar todos
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            {/* Lista de departamentos */}
            <CommandGroup heading="Departamentos">
              <ScrollArea className="h-[250px]">
                {departamentos.map((dept) => {
                  const isSelected = selectedIds.includes(dept.departamento_id)
                  return (
                    <CommandItem
                      key={dept.departamento_id}
                      value={dept.descricao}
                      onSelect={() => handleToggle(dept.departamento_id)}
                    >
                      <Checkbox checked={isSelected} className="mr-2" />
                      <span className="truncate">{dept.descricao}</span>
                    </CommandItem>
                  )
                })}
              </ScrollArea>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
