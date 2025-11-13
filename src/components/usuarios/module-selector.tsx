'use client'

/**
 * ModuleSelector Component
 *
 * Permite selecionar módulos autorizados para um usuário (role = user)
 * Exibe checkboxes organizados na ordem especificada
 */

import { useState, useEffect } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Check, X, Lock } from 'lucide-react'
import type { SystemModule } from '@/types/modules'
import { SYSTEM_MODULES, ALL_MODULE_IDS } from '@/types/modules'

interface ModuleSelectorProps {
  selectedModules: SystemModule[]
  onChange: (modules: SystemModule[]) => void
  disabled?: boolean
  showFullAccessMessage?: boolean
}

export function ModuleSelector({
  selectedModules,
  onChange,
  disabled = false,
  showFullAccessMessage = false
}: ModuleSelectorProps) {
  const [localSelected, setLocalSelected] = useState<SystemModule[]>(selectedModules)

  // Sincronizar com prop externa
  useEffect(() => {
    setLocalSelected(selectedModules)
  }, [selectedModules])

  // Handler para toggle de checkbox individual
  const handleToggle = (moduleId: SystemModule) => {
    const newSelected = localSelected.includes(moduleId)
      ? localSelected.filter(m => m !== moduleId)
      : [...localSelected, moduleId]

    setLocalSelected(newSelected)
    onChange(newSelected)
  }

  // Handler para selecionar todos
  const handleSelectAll = () => {
    setLocalSelected(ALL_MODULE_IDS)
    onChange(ALL_MODULE_IDS)
  }

  // Handler para desselecionar todos
  const handleDeselectAll = () => {
    setLocalSelected([])
    onChange([])
  }

  // Se showFullAccessMessage, mostrar apenas mensagem
  if (showFullAccessMessage) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <Lock className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>Acesso Full Automático:</strong> Superadmin e Admin têm acesso a todos os módulos do sistema.
        </AlertDescription>
      </Alert>
    )
  }

  const allSelected = localSelected.length === ALL_MODULE_IDS.length
  const noneSelected = localSelected.length === 0

  return (
    <div className="space-y-4">
      {/* Header com ações */}
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">
          Módulos Autorizados <span className="text-red-500">*</span>
        </Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={disabled || allSelected}
            className="h-8 text-xs"
          >
            <Check className="mr-1 h-3 w-3" />
            Selecionar Todos
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDeselectAll}
            disabled={disabled || noneSelected}
            className="h-8 text-xs"
          >
            <X className="mr-1 h-3 w-3" />
            Desselecionar Todos
          </Button>
        </div>
      </div>

      {/* Informação */}
      <p className="text-sm text-muted-foreground">
        Selecione os módulos que o usuário terá acesso. Pelo menos um módulo deve ser selecionado.
      </p>

      {/* Alerta se nenhum módulo selecionado */}
      {noneSelected && (
        <Alert variant="destructive">
          <AlertDescription>
            Pelo menos um módulo deve ser selecionado para o usuário ter acesso ao sistema.
          </AlertDescription>
        </Alert>
      )}

      {/* Lista de checkboxes */}
      <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
        {SYSTEM_MODULES.map((module) => {
          const isChecked = localSelected.includes(module.id)

          return (
            <div
              key={module.id}
              className="flex items-start space-x-3 p-3 rounded-md hover:bg-muted/50 transition-colors"
            >
              <Checkbox
                id={`module-${module.id}`}
                checked={isChecked}
                onCheckedChange={() => handleToggle(module.id)}
                disabled={disabled}
                className="mt-0.5"
              />
              <div className="flex-1 space-y-1">
                <Label
                  htmlFor={`module-${module.id}`}
                  className={`font-medium cursor-pointer ${
                    disabled ? 'text-muted-foreground' : ''
                  }`}
                >
                  {module.order}. {module.label}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {module.description}
                </p>
              </div>
              {isChecked && (
                <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
              )}
            </div>
          )
        })}
      </div>

      {/* Contador */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {localSelected.length} de {ALL_MODULE_IDS.length} módulos selecionados
        </span>
        {localSelected.length > 0 && (
          <span className="text-green-600 font-medium">
            ✓ Configuração válida
          </span>
        )}
      </div>
    </div>
  )
}
