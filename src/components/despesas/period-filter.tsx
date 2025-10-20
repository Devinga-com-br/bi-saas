'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon } from 'lucide-react'
import { format, startOfMonth, endOfMonth, subDays, startOfDay, endOfDay, subMonths, subYears } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type PeriodType = 'current_month' | 'current_day' | 'last_7_days' | 'last_30_days' | 'last_6_months' | 'last_year' | 'custom'

interface PeriodOption {
  value: PeriodType
  label: string
}

interface PeriodFilterProps {
  onPeriodChange: (dataInicial: Date, dataFinal: Date) => void
  initialPeriod?: PeriodType
}

const periods: PeriodOption[] = [
  { value: 'current_month', label: 'Mês Atual' },
  { value: 'current_day', label: 'Dia Atual' },
  { value: 'last_7_days', label: 'Últimos 7 Dias' },
  { value: 'last_30_days', label: 'Últimos 30 Dias' },
  { value: 'last_6_months', label: 'Últimos 6 Meses' },
  { value: 'last_year', label: 'Último Ano' },
  { value: 'custom', label: 'Do Intervalo' },
]

export function PeriodFilter({ onPeriodChange, initialPeriod = 'current_month' }: PeriodFilterProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>(initialPeriod)
  const [customStart, setCustomStart] = useState<Date | undefined>(undefined)
  const [customEnd, setCustomEnd] = useState<Date | undefined>(undefined)
  const [open, setOpen] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [showCustomPicker, setShowCustomPicker] = useState(false)

  const calculateDates = (period: PeriodType): { start: Date; end: Date } => {
    const now = new Date()
    
    switch (period) {
      case 'current_month':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        }
      case 'current_day':
        return {
          start: startOfDay(now),
          end: endOfDay(now)
        }
      case 'last_7_days':
        return {
          start: subDays(now, 6),
          end: now
        }
      case 'last_30_days':
        return {
          start: subDays(now, 29),
          end: now
        }
      case 'last_6_months':
        return {
          start: subMonths(now, 6),
          end: now
        }
      case 'last_year':
        return {
          start: subYears(now, 1),
          end: now
        }
      case 'custom':
        return {
          start: customStart || now,
          end: customEnd || now
        }
      default:
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        }
    }
  }

  // Aplicar período inicial automaticamente apenas uma vez
  useEffect(() => {
    if (!initialized) {
      const { start, end } = calculateDates(selectedPeriod)
      onPeriodChange(start, end)
      setInitialized(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized])

  const handleSelectPeriod = (period: PeriodType) => {
    if (period === 'custom') {
      setShowCustomPicker(true)
      return
    }

    setSelectedPeriod(period)
    setShowCustomPicker(false)
    const { start, end } = calculateDates(period)
    onPeriodChange(start, end)
    setOpen(false)
  }

  const handleApplyCustom = () => {
    if (customStart && customEnd) {
      setSelectedPeriod('custom')
      onPeriodChange(customStart, customEnd)
      setOpen(false)
      setShowCustomPicker(false)
    }
  }

  const handleCancelCustom = () => {
    setCustomStart(undefined)
    setCustomEnd(undefined)
    setShowCustomPicker(false)
  }

  const getDisplayLabel = () => {
    if (selectedPeriod === 'custom' && customStart && customEnd) {
      return `${format(customStart, 'dd/MM/yyyy')} → ${format(customEnd, 'dd/MM/yyyy')}`
    }
    
    const option = periods.find(p => p.value === selectedPeriod)
    return option?.label || 'Mês Atual'
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="rounded-full flex items-center gap-2 h-10"
        >
          <CalendarIcon className="w-4 h-4" />
          {getDisplayLabel()}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[320px] p-4" align="start">
        {!showCustomPicker ? (
          <div className="grid grid-cols-2 gap-2">
            {periods.map((period) => (
              <Button
                key={period.value}
                variant="outline"
                onClick={() => handleSelectPeriod(period.value)}
                className={`rounded-full text-sm ${
                  selectedPeriod === period.value 
                    ? 'border-primary bg-primary/10' 
                    : 'hover:bg-accent'
                }`}
              >
                {period.label}
              </Button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Inicial</label>
              <Calendar
                mode="single"
                selected={customStart}
                onSelect={setCustomStart}
                locale={ptBR}
                className="rounded-md border"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data Final</label>
              <Calendar
                mode="single"
                selected={customEnd}
                onSelect={setCustomEnd}
                locale={ptBR}
                className="rounded-md border"
                disabled={(date) => customStart ? date < customStart : false}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={handleCancelCustom} className="text-sm">
                Cancelar
              </Button>
              <Button 
                onClick={handleApplyCustom} 
                disabled={!customStart || !customEnd}
                className="text-sm"
              >
                Aplicar
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
