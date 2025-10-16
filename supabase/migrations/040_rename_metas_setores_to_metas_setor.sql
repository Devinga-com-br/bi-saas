-- Migration: Rename metas_setores to metas_setor for consistency
-- Description: Fix table name mismatch between migrations 034 and 039
-- Also add missing columns to match the expected structure

DO $$
DECLARE
  tenant_record RECORD;
  v_table_exists BOOLEAN;
BEGIN
  FOR tenant_record IN 
    SELECT supabase_schema 
    FROM public.tenants 
    WHERE supabase_schema IS NOT NULL
  LOOP
    -- Check if metas_setores exists
    SELECT EXISTS (
      SELECT 1 
      FROM information_schema.tables 
      WHERE table_schema = tenant_record.supabase_schema 
      AND table_name = 'metas_setores'
    ) INTO v_table_exists;

    IF v_table_exists THEN
      -- Rename the table
      EXECUTE format('
        ALTER TABLE %I.metas_setores RENAME TO metas_setor
      ', tenant_record.supabase_schema);

      -- Rename constraint
      EXECUTE format('
        ALTER TABLE %I.metas_setor 
        RENAME CONSTRAINT metas_setores_unique TO metas_setor_unique
      ', tenant_record.supabase_schema);

      -- Drop old indexes
      EXECUTE format('
        DROP INDEX IF EXISTS %I.idx_metas_setores_setor_data
      ', tenant_record.supabase_schema);

      EXECUTE format('
        DROP INDEX IF EXISTS %I.idx_metas_setores_data
      ', tenant_record.supabase_schema);

      -- Create new indexes with correct naming
      EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_metas_setor_setor_data 
        ON %I.metas_setor(setor_id, data, filial_id)
      ', tenant_record.supabase_schema);

      EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_metas_setor_data 
        ON %I.metas_setor(data, filial_id)
      ', tenant_record.supabase_schema);

      -- Rename trigger
      EXECUTE format('
        DROP TRIGGER IF EXISTS on_metas_setores_update ON %I.metas_setor
      ', tenant_record.supabase_schema);

      EXECUTE format('
        CREATE TRIGGER on_metas_setor_update 
          BEFORE UPDATE ON %I.metas_setor
          FOR EACH ROW 
          EXECUTE FUNCTION handle_updated_at()
      ', tenant_record.supabase_schema);

      RAISE NOTICE 'Renamed metas_setores to metas_setor for schema: %', tenant_record.supabase_schema;
    END IF;

    -- Add missing columns if they don't exist (for compatibility with report function)
    -- Check and add dia_semana_ref column
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = tenant_record.supabase_schema 
      AND table_name = 'metas_setor'
      AND column_name = 'dia_semana_ref'
    ) THEN
      EXECUTE format('
        ALTER TABLE %I.metas_setor 
        ADD COLUMN dia_semana_ref TEXT
      ', tenant_record.supabase_schema);
      
      RAISE NOTICE 'Added dia_semana_ref column to metas_setor for schema: %', tenant_record.supabase_schema;
    END IF;

  END LOOP;
END $$;
