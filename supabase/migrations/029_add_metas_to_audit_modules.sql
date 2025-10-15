-- Add 'metas' to the list of valid modules in audit_logs
ALTER TABLE public.audit_logs 
  DROP CONSTRAINT IF EXISTS audit_logs_module_check;

ALTER TABLE public.audit_logs 
  ADD CONSTRAINT audit_logs_module_check 
  CHECK (module IN ('dashboard', 'usuarios', 'relatorios', 'configuracoes', 'metas'));

COMMENT ON CONSTRAINT audit_logs_module_check ON public.audit_logs IS 'Valid modules: dashboard, usuarios, relatorios, configuracoes, metas';
