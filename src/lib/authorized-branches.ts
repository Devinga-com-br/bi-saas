import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Error thrown when branch authorization cannot be determined.
 * This should result in denying access (fail-closed behavior).
 */
export class BranchAuthorizationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BranchAuthorizationError'
  }
}

/**
 * Get authorized branch IDs for a user.
 * Returns null if user has access to all branches (no restrictions).
 * Returns array of branch IDs if user has restricted access.
 *
 * SECURITY: This function uses fail-closed behavior.
 * If there's an error fetching authorization, it throws an error
 * instead of allowing unrestricted access.
 *
 * @throws BranchAuthorizationError if authorization cannot be determined
 */
export async function getUserAuthorizedBranchIds(
  supabase: SupabaseClient,
  userId: string
): Promise<string[] | null> {
  const { data: authorizedBranches, error } = await supabase
    .from('user_authorized_branches')
    .select('branch_id')
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching authorized branches:', error)
    // SECURITY: Fail closed - deny access if we can't determine authorization
    throw new BranchAuthorizationError(
      'Unable to determine branch authorization. Access denied for security.'
    )
  }

  // If no authorized branches, user has access to all
  if (!authorizedBranches || authorizedBranches.length === 0) {
    return null
  }

  // Return array of authorized branch IDs
  return authorizedBranches.map(ab => ab.branch_id)
}

/**
 * Get authorized branch codes for a user.
 * Returns null if user has access to all branches (no restrictions).
 * Returns array of branch codes if user has restricted access.
 *
 * SECURITY: This function uses fail-closed behavior.
 * If there's an error fetching authorization, it throws an error
 * instead of allowing unrestricted access.
 *
 * @throws BranchAuthorizationError if authorization cannot be determined
 */
export async function getUserAuthorizedBranchCodes(
  supabase: SupabaseClient,
  userId: string
): Promise<string[] | null> {
  const { data: authorizedBranches, error } = await supabase
    .from('user_authorized_branches')
    .select('branch:branches(branch_code)')
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching authorized branches:', error)
    // SECURITY: Fail closed - deny access if we can't determine authorization
    throw new BranchAuthorizationError(
      'Unable to determine branch authorization. Access denied for security.'
    )
  }

  // If no authorized branches, user has access to all
  if (!authorizedBranches || authorizedBranches.length === 0) {
    return null
  }

  // Extract branch codes
  const branchCodes = authorizedBranches
    .map(ab => (ab.branch as { branch_code?: string })?.branch_code)
    .filter((code): code is string => code !== undefined)

  return branchCodes.length > 0 ? branchCodes : null
}

/**
 * Check if user has access to a specific branch.
 * Returns true if user has access (either no restrictions or branch is authorized).
 */
export async function userHasBranchAccess(
  supabase: SupabaseClient,
  userId: string,
  branchId: string
): Promise<boolean> {
  const authorizedBranchIds = await getUserAuthorizedBranchIds(supabase, userId)

  // If null, user has access to all branches
  if (authorizedBranchIds === null) {
    return true
  }

  // Check if branch is in authorized list
  return authorizedBranchIds.includes(branchId)
}

/**
 * Filter a list of branch IDs or codes based on user's authorized branches.
 * Returns filtered list if user has restrictions, or original list if no restrictions.
 *
 * @param requestedValue - The branch value requested ('all' or specific branch ID/code)
 * @param authorizedBranches - User's authorized branches (null = all access)
 * @returns The branch value to use in queries
 */
export function filterBranchByAuthorization(
  requestedValue: string,
  authorizedBranches: string[] | null
): string | string[] {
  // If user has no restrictions (null), use requested value as-is
  if (authorizedBranches === null) {
    return requestedValue
  }

  // If user requested 'all' but has restrictions, return their authorized branches
  if (requestedValue === 'all') {
    return authorizedBranches
  }

  // If user requested specific branch, check if they have access
  if (authorizedBranches.includes(requestedValue)) {
    return requestedValue
  }

  // User doesn't have access to requested branch, return their authorized branches
  // This ensures they still see data they're allowed to see
  return authorizedBranches
}
