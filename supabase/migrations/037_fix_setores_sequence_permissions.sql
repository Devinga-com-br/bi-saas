-- Migration: Fix Setores Sequence Permissions
-- Description: Grant permissions on setores sequence

DO $$
DECLARE
  tenant_record RECORD;
BEGIN
  FOR tenant_record IN 
    SELECT supabase_schema 
    FROM public.tenants 
    WHERE supabase_schema IS NOT NULL
  LOOP
    -- Grant permissions on setores sequence
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %I.setores_id_seq TO authenticated', tenant_record.supabase_schema);
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %I.setores_id_seq TO service_role', tenant_record.supabase_schema);
    
  END LOOP;
END $$;
