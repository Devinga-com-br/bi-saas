import useSWR from 'swr'

interface Branch {
  id: string
  branch_code: string
  tenant_id: string
  store_code?: string
  created_at: string
  updated_at: string
}

interface BranchesResponse {
  branches: Branch[]
}

interface UseBranchesOptions {
  tenantId?: string
  enabled?: boolean
}

export function useBranches({ tenantId, enabled = true }: UseBranchesOptions = {}) {
  const shouldFetch = enabled && tenantId

  const { data, error, isLoading, mutate } = useSWR<BranchesResponse>(
    shouldFetch ? `/api/branches?tenant_id=${tenantId}` : null,
    async (url: string) => {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Erro ao buscar filiais')
      }
      return response.json()
    },
    {
      refreshInterval: 0, // Não atualizar automaticamente
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 2000, // Cache por apenas 2 segundos
    }
  )

  return {
    branches: data?.branches || [],
    isLoading,
    error,
    mutate,
    isEmpty: data?.branches?.length === 0,
  }
}

// Hook para transformar filiais em opções do MultiSelect ou Select
interface UseBranchesOptionsConfig extends UseBranchesOptions {
  includeAll?: boolean
}

export function useBranchesOptions({ tenantId, enabled = true, includeAll = true }: UseBranchesOptionsConfig = {}) {
  const { branches, isLoading, error } = useBranches({ tenantId, enabled })

  const branchOptions = branches.map(branch => ({
    value: branch.branch_code,
    label: branch.store_code
      ? `Filial ${branch.branch_code} - ${branch.store_code}`
      : `Filial ${branch.branch_code}`,
  }))

  const options = includeAll
    ? [{ value: 'all', label: 'Todas as Filiais' }, ...branchOptions]
    : branchOptions

  return {
    branchOptions, // Without "Todas as Filiais"
    options,       // With "Todas as Filiais" (if includeAll is true)
    isLoading,
    error,
    isEmpty: branchOptions.length === 0,
  }
}
