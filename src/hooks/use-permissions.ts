'use client'

import { useMemo } from 'react'
import { useTenantContext } from '@/contexts/tenant-context'
import { getPermissionsForRole, type Permission } from '@/types'

/**
 * Hook to get current user permissions based on their role
 */
export function usePermissions(): Permission & { loading: boolean } {
  const { userProfile, loading } = useTenantContext()

  const permissions = useMemo(() => {
    if (!userProfile) {
      // Default to most restricted permissions if no profile
      return {
        canManageCompanies: false,
        canManageUsers: false,
        canSwitchTenants: false,
        canViewFinancialData: false,
        canEditFinancialData: false,
        canViewSchema: false,
      }
    }

    return getPermissionsForRole(userProfile.role)
  }, [userProfile])

  return {
    ...permissions,
    loading,
  }
}

/**
 * Hook to check if user has a specific permission
 */
export function useHasPermission(permissionKey: keyof Permission): boolean {
  const permissions = usePermissions()
  return permissions[permissionKey]
}

/**
 * Hook to check if user is superadmin
 */
export function useIsSuperAdmin(): boolean {
  const { userProfile } = useTenantContext()
  return userProfile?.role === 'superadmin'
}

/**
 * Hook to check if user is admin or above
 */
export function useIsAdminOrAbove(): boolean {
  const { userProfile } = useTenantContext()
  return userProfile?.role === 'superadmin' || userProfile?.role === 'admin'
}
