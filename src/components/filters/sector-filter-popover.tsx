'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Layers } from 'lucide-react'
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

interface Setor {
  id: number
  nome: string
  departamento_nivel: number
  departamento_ids: number[]
  ativo: boolean
}

interface SectorFilterPopoverProps {
  setores: Setor[]
  selectedIds: number[]
  onChange: (ids: number[]) => void
  disabled?: boolean
  loading?: boolean
}

export function SectorFilterPopover({
  setores,
  selectedIds,
  onChange,
  disabled = false,
  loading = false,
}: SectorFilterPopoverProps) {
  const [open, setOpen] = React.useState(false)

  const allSelected = selectedIds.length === setores.length && setores.length > 0
  const noneSelected = selectedIds.length === 0

  const handleSelectAll = () => {
    onChange(setores.map((s) => s.id))
  }

  const handleDeselectAll = () => {
    onChange([])
  }

  const handleToggle = (setorId: number) => {
    if (selectedIds.includes(setorId)) {
      onChange(selectedIds.filter((id) => id !== setorId))
    } else {
      onChange([...selectedIds, setorId])
    }
  }

  const getButtonLabel = () => {
    if (loading) return 'Carregando...'
    if (setores.length === 0) return 'Nenhum setor'
    if (allSelected || noneSelected) return 'Todos os Setores'
    if (selectedIds.length === 1) {
      const setor = setores.find((s) => s.id === selectedIds[0])
      return setor?.nome || '1 selecionado'
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
            <Layers className="h-4 w-4 shrink-0" />
            <span className="truncate">{getButtonLabel()}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar setor..." />
          <CommandList>
            <CommandEmpty>Nenhum setor encontrado.</CommandEmpty>

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

            {/* Lista de setores */}
            <CommandGroup heading="Setores">
              <ScrollArea className="h-[250px]">
                {setores.map((setor) => {
                  const isSelected = selectedIds.includes(setor.id)
                  return (
                    <CommandItem
                      key={setor.id}
                      value={setor.nome}
                      onSelect={() => handleToggle(setor.id)}
                    >
                      <Checkbox checked={isSelected} className="mr-2" />
                      <span className="truncate">{setor.nome}</span>
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
