'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useBranches } from '@/hooks/use-branches'
import { useTenantContext } from '@/contexts/tenant-context'
import type { ReportFilters } from '../types'

interface RupturaFiltersProps {
  filters: ReportFilters
  onChange: (filters: ReportFilters) => void
}

export function RupturaFilters({ filters, onChange }: RupturaFiltersProps) {
  const { currentTenant } = useTenantContext()
  const { branches } = useBranches({ tenantId: currentTenant?.id })
  const [date, setDate] = useState<Date>(
    new Date(filters.ano, filters.mes - 1)
  )

  // Atualiza os filtros quando a data muda
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setDate(date)
      onChange({
        ...filters,
        mes: date.getMonth() + 1,
        ano: date.getFullYear()
      })
    }
  }

  // Atualiza filial selecionada
  const handleBranchSelect = (branchId: string) => {
    onChange({
      ...filters,
      filialId: branchId
    })
  }

  return (
    <div className="flex flex-col gap-4 p-4 border rounded-lg bg-card">
      <h2 className="text-lg font-semibold">Filtros</h2>
      
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Seletor de Filial */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="filial">Filial</Label>
          <Select 
            value={filters.filialId || 'all'} 
            onValueChange={handleBranchSelect}
          >
            <SelectTrigger id="filial">
              <SelectValue placeholder="Selecione uma filial" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Filiais</SelectItem>
              {branches?.map(branch => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Seletor de Período */}
        <div className="flex flex-col gap-2">
          <Label>Período</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'justify-start text-left font-normal',
                  !date && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? (
                  format(date, 'MMMM yyyy', { locale: ptBR })
                ) : (
                  <span>Selecione o mês</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateSelect}
                initialFocus
                disabled={(date) => date > new Date()}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  )
}