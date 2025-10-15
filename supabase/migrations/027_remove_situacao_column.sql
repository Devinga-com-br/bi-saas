-- Migration: Remove situacao column from metas_mensais
-- Description: Ensure situacao column is removed from all tenant schemas

DO $$
DECLARE
  tenant_record RECORD;
  column_exists boolean;
BEGIN
  FOR tenant_record IN 
    SELECT supabase_schema 
    FROM public.tenants 
    WHERE supabase_schema IS NOT NULL
  LOOP
    -- Check if column exists
    EXECUTE format('
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = %L 
          AND table_name = ''metas_mensais'' 
          AND column_name = ''situacao''
      )', tenant_record.supabase_schema)
    INTO column_exists;
    
    -- Drop column if it exists
    IF column_exists THEN
      EXECUTE format('
        ALTER TABLE %I.metas_mensais 
        DROP COLUMN situacao
      ', tenant_record.supabase_schema);
      
      RAISE NOTICE 'Column situacao dropped from %.metas_mensais', tenant_record.supabase_schema;
    END IF;
  END LOOP;
END $$;
