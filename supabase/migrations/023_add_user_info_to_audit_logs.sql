-- Add user_name and user_email columns to audit_logs
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_name text;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_email text;

-- Update the function to include user_name and user_email
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
