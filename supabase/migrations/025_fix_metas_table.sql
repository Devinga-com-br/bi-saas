-- Migration: Fix metas_mensais table - remove situacao column
-- Description: Remove the situacao column as it's not needed

DO $$
DECLARE
  tenant_record RECORD;
BEGIN
  FOR tenant_record IN 
    SELECT supabase_schema 
    FROM public.tenants 
    WHERE supabase_schema IS NOT NULL
  LOOP
    -- Remove situacao column if exists
    EXECUTE format('
      ALTER TABLE %I.metas_mensais 
      DROP COLUMN IF EXISTS situacao
    ', tenant_record.supabase_schema);
  END LOOP;
END $$;
