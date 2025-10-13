import { Database } from './database.types'

// Database table types
export type Tenant = Database['public']['Tables']['tenants']['Row']
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type UserTenantAccess = Database['public']['Tables']['user_tenant_access']['Row']
export type Branch = Database['public']['Tables']['branches']['Row']

// User roles
export type UserRole = 'superadmin' | 'admin' | 'user' | 'viewer'

// Tenant types
export type TenantType = 'company' | 'branch'

// Extended tenant with relationships
export interface TenantWithParent extends Tenant {
  parent?: Tenant | null
}

// Tenant with branches
export interface TenantWithBranches extends Tenant {
  branches?: Branch[]
}

// Branch with tenant relationship
export interface BranchWithTenant extends Branch {
  tenant?: Tenant | null
}

// User with tenant relationship (tenant can be null for superadmins)
export interface UserWithTenant extends UserProfile {
  tenant: Tenant | null
}

// User with multiple accessible tenants (for superadmins)
export interface UserWithAccessibleTenants extends UserProfile {
  accessible_tenants: Tenant[]
}

// Complete user profile with all relationships
export interface CompleteUserProfile extends UserProfile {
  tenant: Tenant | null
  accessible_tenants?: Tenant[]
  current_tenant_id?: string | null
}

// Permission definitions
export interface Permission {
  canManageCompanies: boolean
  canManageUsers: boolean
  canSwitchTenants: boolean
  canViewFinancialData: boolean
  canEditFinancialData: boolean
  canViewSchema: boolean
}

// Role-based permissions mapping
export const RolePermissions: Record<UserRole, Permission> = {
  superadmin: {
    canManageCompanies: true,
    canManageUsers: true,
    canSwitchTenants: true,
    canViewFinancialData: true,
    canEditFinancialData: true,
    canViewSchema: true,
  },
  admin: {
    canManageCompanies: false,
    canManageUsers: true,
    canSwitchTenants: false,
    canViewFinancialData: true,
    canEditFinancialData: true,
    canViewSchema: false,
  },
  user: {
    canManageCompanies: false,
    canManageUsers: false,
    canSwitchTenants: false,
    canViewFinancialData: true,
    canEditFinancialData: false,
    canViewSchema: false,
  },
  viewer: {
    canManageCompanies: false,
    canManageUsers: false,
    canSwitchTenants: false,
    canViewFinancialData: true,
    canEditFinancialData: false,
    canViewSchema: false,
  },
}

// Helper function to get permissions for a role
export function getPermissionsForRole(role: UserRole): Permission {
  return RolePermissions[role]
}

// Helper function to check if user is superadmin
export function isSuperAdmin(profile: UserProfile | null): boolean {
  return profile?.role === 'superadmin'
}

// Helper function to check if user is admin or above
export function isAdminOrAbove(profile: UserProfile | null): boolean {
  return profile?.role === 'superadmin' || profile?.role === 'admin'
}

// Role labels in Portuguese
export const RoleLabels: Record<UserRole, string> = {
  superadmin: 'Super Administrador',
  admin: 'Administrador',
  user: 'Gestor',
  viewer: 'Visualizador',
}
