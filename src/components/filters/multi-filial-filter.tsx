'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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
import { Checkbox } from '@/components/ui/checkbox'

export interface FilialOption {
  value: string
  label: string
}

interface MultiFilialFilterProps {
  filiais: FilialOption[]
  selectedFiliais: FilialOption[]
  onChange: (filiais: FilialOption[]) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function MultiFilialFilter({
  filiais,
  selectedFiliais,
  onChange,
  disabled = false,
  placeholder = 'Selecionar filiais',
  className,
}: MultiFilialFilterProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState('')

  // Memoizar filiais selecionadas como Set para busca rápida
  const selectedSet = React.useMemo(
    () => new Set(selectedFiliais.map((f) => f.value)),
    [selectedFiliais]
  )

  // Filtrar filiais baseado na busca
  const filteredFiliais = React.useMemo(() => {
    if (!searchValue) return filiais
    const search = searchValue.toLowerCase()
    return filiais.filter((filial) =>
      filial.label.toLowerCase().includes(search)
    )
  }, [filiais, searchValue])

  // Toggle individual filial
  const toggleFilial = React.useCallback(
    (filial: FilialOption) => {
      const isSelected = selectedSet.has(filial.value)
      
      if (isSelected) {
        onChange(selectedFiliais.filter((f) => f.value !== filial.value))
      } else {
        onChange([...selectedFiliais, filial])
      }
    },
    [selectedFiliais, selectedSet, onChange]
  )

  // Remover filial específica (não usado atualmente)
  // const removeFilial = React.useCallback(
  //   (value: string) => {
  //     onChange(selectedFiliais.filter((f) => f.value !== value))
  //   },
  //   [selectedFiliais, onChange]
  // )

  // Selecionar todas as filiais
  const selectAll = React.useCallback(() => {
    onChange(filiais)
    setSearchValue('')
  }, [filiais, onChange])

  // Limpar seleção
  const clearAll = React.useCallback(() => {
    onChange([])
    setSearchValue('')
    // NÃO fecha o popover - usuário pode selecionar outras filiais
  }, [onChange])

  // Texto do botão principal
  const buttonText = React.useMemo(() => {
    if (selectedFiliais.length === 0) return placeholder
    if (selectedFiliais.length === 1) return selectedFiliais[0].label
    if (selectedFiliais.length === filiais.length) return 'Todas as filiais'
    return `${selectedFiliais.length} filiais`
  }, [selectedFiliais, filiais.length, placeholder])

  return (
    <div className={cn('w-full', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-10 w-full justify-between"
            disabled={disabled}
          >
            <span className="truncate">{buttonText}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar filial..."
              value={searchValue}
              onValueChange={setSearchValue}
            />

            {filteredFiliais.length === 0 ? (
              <CommandEmpty>Nenhuma filial encontrada.</CommandEmpty>
            ) : (
              <div className="max-h-[320px] overflow-hidden">
                {/* Ações rápidas */}
                <CommandGroup>
                  <CommandItem
                    onSelect={selectAll}
                    className="cursor-pointer"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Selecionar todas ({filiais.length})
                  </CommandItem>
                  <CommandItem
                    onSelect={clearAll}
                    className="cursor-pointer"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Limpar seleção
                  </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                {/* Lista de filiais com ScrollArea */}
                <ScrollArea className="h-[220px]">
                  <CommandGroup>
                    {filteredFiliais.map((filial) => {
                      const isSelected = selectedSet.has(filial.value)
                      return (
                        <CommandItem
                          key={filial.value}
                          value={filial.value}
                          onSelect={() => toggleFilial(filial)}
                          className="cursor-pointer"
                        >
                          <Checkbox
                            checked={isSelected}
                            className="mr-2"
                            onCheckedChange={() => toggleFilial(filial)}
                          />
                          <span className="flex-1">{filial.label}</span>
                          {isSelected && (
                            <Check className="ml-2 h-4 w-4 text-primary" />
                          )}
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                </ScrollArea>
              </div>
            )}
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
