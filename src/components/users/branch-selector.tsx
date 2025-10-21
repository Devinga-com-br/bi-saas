'use client'

import { useMemo } from 'react'
import { Label } from '@/components/ui/label'
import { MultiSelect } from '@/components/ui/multi-select'
import { useBranches } from '@/hooks/use-branches'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info } from 'lucide-react'

type Option = Record<'value' | 'label', string>

interface BranchSelectorProps {
  tenantId?: string
  value: string[] // Array of branch IDs (UUIDs)
  onChange: (branchIds: string[]) => void
  disabled?: boolean
  className?: string
}

export function BranchSelector({
  tenantId,
  value = [],
  onChange,
  disabled = false,
  className,
}: BranchSelectorProps) {
  const { branches, isLoading: isLoadingBranches } = useBranches({
    tenantId,
    enabled: !!tenantId
  })

  // Convert branches to options with UUID as value
  const branchOptions = useMemo(() => {
    return branches.map(branch => ({
      value: branch.id,
      label: branch.store_code
        ? `Filial ${branch.branch_code} - ${branch.store_code}`
        : `Filial ${branch.branch_code}`,
    }))
  }, [branches])

  // Convert value (UUIDs) to selected options
  const selectedBranches = useMemo(() => {
    if (!value || value.length === 0) return []

    return branchOptions.filter((option) =>
      value.includes(option.value)
    )
  }, [value, branchOptions])

  const handleBranchChange = (newValue: Option[]) => {
    onChange(newValue.map((option) => option.value))
  }

  return (
    <div className={className}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="authorized-branches">
          Filiais Autorizadas
          <span className="text-xs text-muted-foreground ml-2 font-normal">
            (opcional)
          </span>
        </Label>

        <MultiSelect
          options={branchOptions}
          value={selectedBranches}
          onValueChange={handleBranchChange}
          placeholder={
            isLoadingBranches
              ? 'Carregando filiais...'
              : 'Selecione as filiais autorizadas'
          }
          disabled={disabled || isLoadingBranches}
          variant="default"
        />

        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-xs text-blue-800 dark:text-blue-300">
            {selectedBranches.length === 0 ? (
              <>
                <strong>Acesso total:</strong> Usuário terá acesso a todas as filiais da empresa.
              </>
            ) : (
              <>
                <strong>Acesso restrito:</strong> Usuário terá acesso apenas às {selectedBranches.length} filiai{selectedBranches.length === 1 ? '' : 's'} selecionada{selectedBranches.length === 1 ? '' : 's'}.
              </>
            )}
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}
