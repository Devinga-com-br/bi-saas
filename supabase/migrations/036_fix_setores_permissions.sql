-- Migration: Fix Setores Permissions
-- Description: Add RLS policies for setores table and departments tables

DO $$
DECLARE
  tenant_record RECORD;
BEGIN
  FOR tenant_record IN 
    SELECT supabase_schema 
    FROM public.tenants 
    WHERE supabase_schema IS NOT NULL
  LOOP
    -- Enable RLS on setores table
    EXECUTE format('ALTER TABLE %I.setores ENABLE ROW LEVEL SECURITY', tenant_record.supabase_schema);
    
    -- Create policy for setores
    EXECUTE format('
      DROP POLICY IF EXISTS setores_all_policy ON %I.setores
    ', tenant_record.supabase_schema);
    
    EXECUTE format('
      CREATE POLICY setores_all_policy ON %I.setores
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true)
    ', tenant_record.supabase_schema);
    
    -- Grant permissions on setores
    EXECUTE format('GRANT ALL ON %I.setores TO authenticated', tenant_record.supabase_schema);
    EXECUTE format('GRANT ALL ON %I.setores TO service_role', tenant_record.supabase_schema);
    
    -- Enable RLS and create policies for department tables
    FOR i IN 1..6 LOOP
      -- Enable RLS
      EXECUTE format('ALTER TABLE %I.departments_level_%s ENABLE ROW LEVEL SECURITY', 
        tenant_record.supabase_schema, i);
      
      -- Drop existing policy if exists
      EXECUTE format('
        DROP POLICY IF EXISTS departments_level_%s_all_policy ON %I.departments_level_%s
      ', i, tenant_record.supabase_schema, i);
      
      -- Create policy
      EXECUTE format('
        CREATE POLICY departments_level_%s_all_policy ON %I.departments_level_%s
        FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true)
      ', i, tenant_record.supabase_schema, i);
      
      -- Grant permissions
      EXECUTE format('GRANT ALL ON %I.departments_level_%s TO authenticated', 
        tenant_record.supabase_schema, i);
      EXECUTE format('GRANT ALL ON %I.departments_level_%s TO service_role', 
        tenant_record.supabase_schema, i);
    END LOOP;
    
  END LOOP;
END $$;
