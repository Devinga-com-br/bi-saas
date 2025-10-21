-- Migration: Create user_authorized_branches table
-- Description: Allows restricting user access to specific branches
-- When empty, user has access to all branches (default behavior)

-- Create user_authorized_branches table in public schema
CREATE TABLE IF NOT EXISTS public.user_authorized_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique user-branch combinations
  UNIQUE(user_id, branch_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_authorized_branches_user_id
  ON public.user_authorized_branches(user_id);

CREATE INDEX IF NOT EXISTS idx_user_authorized_branches_branch_id
  ON public.user_authorized_branches(branch_id);

-- Enable RLS
ALTER TABLE public.user_authorized_branches ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Superadmins can see all
CREATE POLICY "Superadmins can view all authorized branches"
  ON public.user_authorized_branches
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'superadmin'
    )
  );

-- Admins can see their tenant's users
CREATE POLICY "Admins can view their tenant's authorized branches"
  ON public.user_authorized_branches
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up1
      INNER JOIN public.user_profiles up2 ON up1.tenant_id = up2.tenant_id
      WHERE up1.id = auth.uid()
      AND up1.role IN ('admin', 'superadmin')
      AND up2.id = user_authorized_branches.user_id
    )
  );

-- Users can see their own authorized branches
CREATE POLICY "Users can view their own authorized branches"
  ON public.user_authorized_branches
  FOR SELECT
  USING (user_id = auth.uid());

-- Admins and superadmins can insert
CREATE POLICY "Admins can insert authorized branches"
  ON public.user_authorized_branches
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'superadmin')
    )
  );

-- Admins and superadmins can delete
CREATE POLICY "Admins can delete authorized branches"
  ON public.user_authorized_branches
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'superadmin')
    )
  );

-- Function to get user's authorized branch IDs
-- Returns empty array if user has access to all branches (no restrictions)
CREATE OR REPLACE FUNCTION public.get_user_authorized_branch_ids(p_user_id UUID)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_branch_ids UUID[];
BEGIN
  -- Get authorized branches for user
  SELECT ARRAY_AGG(branch_id)
  INTO v_branch_ids
  FROM public.user_authorized_branches
  WHERE user_id = p_user_id;

  -- If NULL (no restrictions), return empty array to signal "all branches"
  RETURN COALESCE(v_branch_ids, ARRAY[]::UUID[]);
END;
$$;

-- Function to check if user has access to a specific branch
CREATE OR REPLACE FUNCTION public.user_has_branch_access(
  p_user_id UUID,
  p_branch_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_restrictions BOOLEAN;
  v_has_access BOOLEAN;
BEGIN
  -- Check if user has any branch restrictions
  SELECT EXISTS (
    SELECT 1 FROM public.user_authorized_branches
    WHERE user_id = p_user_id
  ) INTO v_has_restrictions;

  -- If no restrictions, user has access to all branches
  IF NOT v_has_restrictions THEN
    RETURN TRUE;
  END IF;

  -- Check if user has access to this specific branch
  SELECT EXISTS (
    SELECT 1 FROM public.user_authorized_branches
    WHERE user_id = p_user_id AND branch_id = p_branch_id
  ) INTO v_has_access;

  RETURN v_has_access;
END;
$$;

COMMENT ON TABLE public.user_authorized_branches IS 'Restricts user access to specific branches. Empty = access to all branches (default).';
COMMENT ON FUNCTION public.get_user_authorized_branch_ids IS 'Returns array of authorized branch IDs for user. Empty array means all branches.';
COMMENT ON FUNCTION public.user_has_branch_access IS 'Checks if user has access to a specific branch. Returns true if no restrictions or if branch is authorized.';
