'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface AuthorizedBranch {
  id: string
  user_id: string
  branch_id: string
  created_at: string
}

export interface AuthorizedBranchWithDetails extends AuthorizedBranch {
  branch?: {
    id: string
    nome: string
    codigo?: string
  }
}

interface UseAuthorizedBranchesOptions {
  userId?: string
}

interface UseAuthorizedBranchesReturn {
  authorizedBranches: AuthorizedBranchWithDetails[]
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
  addBranch: (branchId: string) => Promise<void>
  removeBranch: (branchId: string) => Promise<void>
  setBranches: (branchIds: string[]) => Promise<void>
  hasRestrictions: boolean
}

export function useAuthorizedBranches(
  options: UseAuthorizedBranchesOptions = {}
): UseAuthorizedBranchesReturn {
  const [authorizedBranches, setAuthorizedBranches] = useState<AuthorizedBranchWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  const fetchAuthorizedBranches = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      let userId = options.userId

      // If no userId provided, get current user
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          throw new Error('User not authenticated')
        }
        userId = user.id
      }

      // Fetch authorized branches with branch details
      const { data, error: fetchError } = await supabase
        .from('user_authorized_branches')
        .select(`
          id,
          user_id,
          branch_id,
          created_at,
          branch:branches (
            id,
            nome,
            codigo
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

      if (fetchError) throw fetchError

      setAuthorizedBranches(data || [])
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch authorized branches'))
    } finally {
      setIsLoading(false)
    }
  }, [options.userId, supabase])

  const addBranch = async (branchId: string) => {
    try {
      let userId = options.userId

      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User not authenticated')
        userId = user.id
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (supabase as any)
        .from('user_authorized_branches')
        .insert({
          user_id: userId,
          branch_id: branchId,
        })

      if (insertError) throw insertError

      await fetchAuthorizedBranches()
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to add branch'))
      throw err
    }
  }

  const removeBranch = async (branchId: string) => {
    try {
      let userId = options.userId

      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User not authenticated')
        userId = user.id
      }

      const { error: deleteError } = await supabase
        .from('user_authorized_branches')
        .delete()
        .eq('user_id', userId)
        .eq('branch_id', branchId)

      if (deleteError) throw deleteError

      await fetchAuthorizedBranches()
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to remove branch'))
      throw err
    }
  }

  const setBranches = async (branchIds: string[]) => {
    try {
      let userId = options.userId

      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User not authenticated')
        userId = user.id
      }

      // Delete all existing authorized branches for this user
      const { error: deleteError } = await supabase
        .from('user_authorized_branches')
        .delete()
        .eq('user_id', userId)

      if (deleteError) throw deleteError

      // If branchIds is empty, user has access to all branches (no restrictions)
      if (branchIds.length === 0) {
        await fetchAuthorizedBranches()
        return
      }

      // Insert new authorized branches
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (supabase as any)
        .from('user_authorized_branches')
        .insert(
          branchIds.map(branchId => ({
            user_id: userId,
            branch_id: branchId,
          }))
        )

      if (insertError) throw insertError

      await fetchAuthorizedBranches()
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to set branches'))
      throw err
    }
  }

  useEffect(() => {
    fetchAuthorizedBranches()
  }, [fetchAuthorizedBranches])

  return {
    authorizedBranches,
    isLoading,
    error,
    refetch: fetchAuthorizedBranches,
    addBranch,
    removeBranch,
    setBranches,
    hasRestrictions: authorizedBranches.length > 0,
  }
}
