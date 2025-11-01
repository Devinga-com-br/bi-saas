'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon } from 'lucide-react'
import { format, startOfMonth, endOfMonth, subDays, startOfDay, endOfDay, subMonths, subYears, parse, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
]

export function PeriodFilter({ onPeriodChange, initialPeriod = 'current_month' }: PeriodFilterProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>(initialPeriod)
  const [customStart] = useState<Date | undefined>(undefined)
  const [customEnd] = useState<Date | undefined>(undefined)
  const [open, setOpen] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // Estados para os inputs de data
  const [startDateInput, setStartDateInput] = useState<string>('')
  const [endDateInput, setEndDateInput] = useState<string>('')

  // Estados para controlar os datepickers individuais
  const [showStartDatePicker, setShowStartDatePicker] = useState(false)
  const [showEndDatePicker, setShowEndDatePicker] = useState(false)

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
      setStartDateInput(format(start, 'dd/MM/yyyy'))
      setEndDateInput(format(end, 'dd/MM/yyyy'))
      setInitialized(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized])

  // Atualizar inputs quando as datas mudarem via seleção de período
  useEffect(() => {
    if (selectedPeriod !== 'custom') {
      const { start, end } = calculateDates(selectedPeriod)
      setStartDateInput(format(start, 'dd/MM/yyyy'))
      setEndDateInput(format(end, 'dd/MM/yyyy'))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod])

  const handleSelectPeriod = (period: PeriodType) => {
    setSelectedPeriod(period)
    const { start, end } = calculateDates(period)
    setStartDateInput(format(start, 'dd/MM/yyyy'))
    setEndDateInput(format(end, 'dd/MM/yyyy'))
    onPeriodChange(start, end)
    setOpen(false)
  }

  const handleStartDateChange = (value: string) => {
    setStartDateInput(value)

    // Tentar fazer parse da data no formato dd/MM/yyyy
    if (value.length === 10) {
      const parsedDate = parse(value, 'dd/MM/yyyy', new Date())
      if (isValid(parsedDate)) {
        setSelectedPeriod('custom')
        const endDate = endDateInput ? parse(endDateInput, 'dd/MM/yyyy', new Date()) : new Date()
        if (isValid(endDate)) {
          onPeriodChange(parsedDate, endDate)
        }
      }
    }
  }

  const handleEndDateChange = (value: string) => {
    setEndDateInput(value)

    // Tentar fazer parse da data no formato dd/MM/yyyy
    if (value.length === 10) {
      const parsedDate = parse(value, 'dd/MM/yyyy', new Date())
      if (isValid(parsedDate)) {
        setSelectedPeriod('custom')
        const startDate = startDateInput ? parse(startDateInput, 'dd/MM/yyyy', new Date()) : new Date()
        if (isValid(startDate)) {
          onPeriodChange(startDate, parsedDate)
        }
      }
    }
  }

  const handleStartDateSelect = (date: Date | undefined) => {
    if (date) {
      setStartDateInput(format(date, 'dd/MM/yyyy'))
      setSelectedPeriod('custom')
      const endDate = endDateInput ? parse(endDateInput, 'dd/MM/yyyy', new Date()) : new Date()
      if (isValid(endDate)) {
        onPeriodChange(date, endDate)
      }
      setShowStartDatePicker(false)
    }
  }

  const handleEndDateSelect = (date: Date | undefined) => {
    if (date) {
      setEndDateInput(format(date, 'dd/MM/yyyy'))
      setSelectedPeriod('custom')
      const startDate = startDateInput ? parse(startDateInput, 'dd/MM/yyyy', new Date()) : new Date()
      if (isValid(startDate)) {
        onPeriodChange(startDate, date)
      }
      setShowEndDatePicker(false)
    }
  }


  const getDisplayLabel = () => {
    if (selectedPeriod === 'custom' && customStart && customEnd) {
      return `${format(customStart, 'dd/MM/yyyy')} → ${format(customEnd, 'dd/MM/yyyy')}`
    }
    
    const option = periods.find(p => p.value === selectedPeriod)
    return option?.label || 'Mês Atual'
  }

  return (
    <div className="flex flex-col gap-4 w-full lg:flex-row lg:items-end lg:gap-2">
      {/* Filtrar por */}
      <div className="flex flex-col gap-2 w-full sm:w-auto">
        <Label className="text-sm">Filtrar por:</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="rounded-full flex items-center gap-2 h-10 w-full sm:w-auto"
            >
              <CalendarIcon className="w-4 h-4" />
              {getDisplayLabel()}
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-[320px] p-4" align="start">
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
          </PopoverContent>
        </Popover>
      </div>

      {/* Input de Data Inicial com Datepicker */}
      <div className="flex flex-col gap-2 w-full sm:w-auto">
        <Label className="text-sm">Data Inicial</Label>
        <div className="relative">
          <Input
            type="text"
            placeholder="dd/mm/aaaa"
            value={startDateInput}
            onChange={(e) => handleStartDateChange(e.target.value)}
            className="w-full sm:w-[140px] h-10 text-center pr-9"
            maxLength={10}
          />
          <Popover open={showStartDatePicker} onOpenChange={setShowStartDatePicker}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-accent"
              >
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDateInput ? parse(startDateInput, 'dd/MM/yyyy', new Date()) : undefined}
                onSelect={handleStartDateSelect}
                locale={ptBR}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Seta separadora - oculta em mobile */}
      <span className="hidden lg:block text-muted-foreground self-end pb-2">→</span>

      {/* Input de Data Final com Datepicker */}
      <div className="flex flex-col gap-2 w-full sm:w-auto">
        <Label className="text-sm">Data Final</Label>
        <div className="relative">
          <Input
            type="text"
            placeholder="dd/mm/aaaa"
            value={endDateInput}
            onChange={(e) => handleEndDateChange(e.target.value)}
            className="w-full sm:w-[140px] h-10 text-center pr-9"
            maxLength={10}
          />
          <Popover open={showEndDatePicker} onOpenChange={setShowEndDatePicker}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-accent"
              >
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDateInput ? parse(endDateInput, 'dd/MM/yyyy', new Date()) : undefined}
                onSelect={handleEndDateSelect}
                locale={ptBR}
                disabled={(date) => {
                  const startDate = startDateInput ? parse(startDateInput, 'dd/MM/yyyy', new Date()) : undefined
                  return startDate && isValid(startDate) ? date < startDate : false
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  )
}
