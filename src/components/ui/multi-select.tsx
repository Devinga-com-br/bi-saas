'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { CommandGroup, CommandItem } from '@/components/ui/command'
import { Command as CommandPrimitive } from 'cmdk'

type Option = Record<'value' | 'label', string>

const multiSelectVariants = cva(
  'm-1 transition-all duration-100 ease-in-out',
  {
    variants: {
      variant: {
        default:
          'border-foreground/10 text-foreground bg-card hover:bg-card/80',
        secondary:
          'border-foreground/10 bg-secondary text-secondary-foreground hover:bg-secondary/80',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

interface MultiSelectProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'value'>,
    VariantProps<typeof multiSelectVariants> {
  options: Option[]
  value: Option[]
  onValueChange: (value: Option[]) => void
  placeholder?: string
  disabled?: boolean
}

export const MultiSelect = React.forwardRef<
  HTMLDivElement,
  MultiSelectProps
>((
  {
    options,
    value,
    onValueChange,
    variant,
    placeholder = 'Selecione...',
    className,
    disabled,
  },
  ref
) => {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState('')

  const handleSelect = (option: Option) => {
    onValueChange([...value, option])
  }

  const handleDeselect = (option: Option) => {
    onValueChange(value.filter((v) => v.value !== option.value))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const input = e.currentTarget.querySelector('input')
    if (input) {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (input.value === '' && value.length > 0) {
          const lastValue = value[value.length - 1]
          handleDeselect(lastValue)
        }
      }
      if (e.key === 'Escape') {
        input.blur()
      }
    }
  }

  const selectedValues = new Set(value.map((v) => v.value))
  const filteredOptions = options.filter((option) => !selectedValues.has(option.value))

  return (
    <CommandPrimitive ref={ref} onKeyDown={handleKeyDown} className="overflow-visible bg-transparent">
      <div
        className={cn(
          'group rounded-md border border-input px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
          className,
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <div className="flex flex-wrap gap-1">
          {value.map((option) => (
            <Badge
              key={option.value}
              className={cn(multiSelectVariants({ variant }))}
            >
              {option.label}
              <button
                className="ml-2 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleDeselect(option)
                  }
                }}
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onClick={() => handleDeselect(option)}
                disabled={disabled}
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            </Badge>
          ))}
          <CommandPrimitive.Input
            placeholder={placeholder}
            className="ml-2 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
            value={inputValue}
            onValueChange={setInputValue}
            onBlur={() => setOpen(false)}
            onFocus={() => !disabled && setOpen(true)}
            disabled={disabled}
          />
        </div>
      </div>
      <div className="relative mt-2">
        {open && !disabled && filteredOptions.length > 0 ? (
          <div className="absolute top-0 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
            <CommandGroup className="h-full overflow-auto">
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onSelect={() => {
                    setInputValue('')
                    handleSelect(option)
                  }}
                  className={'cursor-pointer'}
                >
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        ) : null}
      </div>
    </CommandPrimitive>
  )
})

MultiSelect.displayName = 'MultiSelect'
