import useSWR from 'swr'

interface Branch {
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

// Hook para transformar filiais em opções do MultiSelect
export function useBranchesOptions({ tenantId, enabled = true }: UseBranchesOptions = {}) {
  const { branches, isLoading, error } = useBranches({ tenantId, enabled })

  const options = branches.map(branch => ({
    value: branch.branch_code,
    label: branch.store_code 
      ? `Filial ${branch.branch_code} - ${branch.store_code}`
      : `Filial ${branch.branch_code}`,
  }))

  return {
    options,
    isLoading,
    error,
    isEmpty: options.length === 0,
  }
}
