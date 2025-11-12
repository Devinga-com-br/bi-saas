"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format, parse, isValid } from "date-fns"
import { ptBR } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

export interface DatePickerProps {
  value?: Date
  onChange: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  inputClassName?: string
  minDate?: Date
  maxDate?: Date
}

export function DatePicker({
  value,
  onChange,
  placeholder = "dd/mm/aaaa",
  disabled = false,
  className,
  inputClassName,
  minDate,
  maxDate,
}: DatePickerProps) {
  const [inputValue, setInputValue] = React.useState("")
  const [isOpen, setIsOpen] = React.useState(false)
  const [isValidDate, setIsValidDate] = React.useState(true)

  // Sincronizar input com value prop
  React.useEffect(() => {
    if (value) {
      setInputValue(format(value, "dd/MM/yyyy", { locale: ptBR }))
      setIsValidDate(true)
    } else {
      setInputValue("")
      setIsValidDate(true)
    }
  }, [value])

  // Formatar input enquanto digita
  const formatInput = (rawValue: string) => {
    // Remove tudo que não é número
    const numbers = rawValue.replace(/\D/g, "")

    // Aplica máscara DD/MM/AAAA
    if (numbers.length === 0) return ""
    if (numbers.length <= 2) return numbers
    if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`
  }

  // Handler para digitação no input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    const formatted = formatInput(rawValue)
    setInputValue(formatted)

    // Se completou 10 caracteres (DD/MM/AAAA), valida e dispara onChange
    if (formatted.length === 10) {
      const parsed = parse(formatted, "dd/MM/yyyy", new Date())

      if (isValid(parsed)) {
        // Verifica limites min/max
        let dateIsValid = true
        if (minDate && parsed < minDate) dateIsValid = false
        if (maxDate && parsed > maxDate) dateIsValid = false

        if (dateIsValid) {
          setIsValidDate(true)
          onChange(parsed)
        } else {
          setIsValidDate(false)
        }
      } else {
        setIsValidDate(false)
      }
    } else {
      // Data incompleta, ainda não valida
      setIsValidDate(true)
    }
  }

  // Handler para seleção no calendar
  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      setInputValue(format(date, "dd/MM/yyyy", { locale: ptBR }))
      setIsValidDate(true)
      onChange(date)
      setIsOpen(false)
    }
  }

  // Handler para limpar input
  const handleInputBlur = () => {
    // Se o input está vazio, limpa o valor
    if (inputValue === "") {
      onChange(undefined)
      setIsValidDate(true)
    }
    // Se está incompleto (menos de 10 caracteres), marca como inválido
    else if (inputValue.length > 0 && inputValue.length < 10) {
      setIsValidDate(false)
    }
  }

  return (
    <div className={cn("relative", className)}>
      <Input
        type="text"
        placeholder={placeholder}
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        disabled={disabled}
        className={cn(
          "h-10 text-center pr-9",
          !isValidDate && inputValue.length > 0 && "border-destructive focus-visible:ring-destructive",
          inputClassName
        )}
        maxLength={10}
        autoComplete="off"
      />
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-accent"
            aria-label="Abrir calendário"
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align="start"
          avoidCollisions={true}
        >
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleCalendarSelect}
            locale={ptBR}
            fixedSize={true}
            disabled={(date) => {
              if (minDate && date < minDate) return true
              if (maxDate && date > maxDate) return true
              return false
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
