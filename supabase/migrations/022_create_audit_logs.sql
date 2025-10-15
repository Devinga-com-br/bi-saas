-- Create audit logs table in public schema (central)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name text,
  user_email text,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  module text NOT NULL CHECK (module IN ('dashboard', 'usuarios', 'relatorios', 'configuracoes')),
  sub_module text, -- Para relatorios específicos como 'ruptura-abcd'
  action text DEFAULT 'access',
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT (NOW() AT TIME ZONE 'America/Sao_Paulo')
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON public.audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON public.audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON public.audit_logs(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy for superadmins to see all logs
CREATE POLICY "Superadmins can view all logs"
  ON public.audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'superadmin'
    )
  );

-- Policy for users to see their own logs
CREATE POLICY "Users can view their own logs"
  ON public.audit_logs
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy for inserting logs (anyone authenticated can insert)
CREATE POLICY "Authenticated users can insert logs"
  ON public.audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Function to insert audit log
CREATE OR REPLACE FUNCTION public.insert_audit_log(
  p_module text,
  p_sub_module text DEFAULT NULL,
  p_tenant_id uuid DEFAULT NULL,
  p_user_name text DEFAULT NULL,
  p_user_email text DEFAULT NULL,
  p_action text DEFAULT 'access',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    user_name,
    user_email,
    tenant_id,
    module,
    sub_module,
    action,
    metadata,
    created_at
  ) VALUES (
    auth.uid(),
    p_user_name,
    p_user_email,
    p_tenant_id,
    p_module,
    p_sub_module,
    p_action,
    p_metadata,
    NOW() AT TIME ZONE 'America/Sao_Paulo'
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.insert_audit_log TO authenticated;

COMMENT ON TABLE public.audit_logs IS 'Central audit log table for tracking user access to modules';
COMMENT ON FUNCTION public.insert_audit_log IS 'Insert audit log entry with São Paulo timezone';
