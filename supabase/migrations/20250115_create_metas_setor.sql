-- Migration: Create metas por setor tables
-- Description: Create tables for sector goals (metas) management

-- Function to create setores and metas_setor tables in each tenant schema
CREATE OR REPLACE FUNCTION create_metas_setor_tables()
RETURNS void AS $$
DECLARE
  tenant_record RECORD;
BEGIN
  FOR tenant_record IN 
    SELECT supabase_schema 
    FROM public.tenants 
    WHERE supabase_schema IS NOT NULL
  LOOP
    -- Create setores table
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.setores (
        id BIGSERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        nivel SMALLINT NOT NULL CHECK (nivel BETWEEN 1 AND 6),
        departamento_ids BIGINT[] NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )', tenant_record.supabase_schema);

    -- Create indexes for setores
    EXECUTE format('
      CREATE INDEX IF NOT EXISTS idx_%I_setores_nome 
      ON %I.setores(nome)', 
      tenant_record.supabase_schema, tenant_record.supabase_schema);

    EXECUTE format('
      CREATE INDEX IF NOT EXISTS idx_%I_setores_nivel 
      ON %I.setores(nivel)', 
      tenant_record.supabase_schema, tenant_record.supabase_schema);

    -- Create metas_setor table
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.metas_setor (
        id BIGSERIAL PRIMARY KEY,
        setor_id BIGINT NOT NULL REFERENCES %I.setores(id) ON DELETE CASCADE,
        filial_id BIGINT NOT NULL,
        data DATE NOT NULL,
        dia_semana TEXT NOT NULL,
        meta_percentual NUMERIC(5,2) NOT NULL,
        data_referencia DATE NOT NULL,
        valor_referencia NUMERIC(15,2),
        valor_meta NUMERIC(15,2),
        valor_realizado NUMERIC(15,2),
        diferenca NUMERIC(15,2),
        diferenca_percentual NUMERIC(5,2),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(setor_id, filial_id, data)
      )', tenant_record.supabase_schema, tenant_record.supabase_schema);

    -- Create indexes for metas_setor
    EXECUTE format('
      CREATE INDEX IF NOT EXISTS idx_%I_metas_setor_setor_filial_data 
      ON %I.metas_setor(setor_id, filial_id, data)', 
      tenant_record.supabase_schema, tenant_record.supabase_schema);

    EXECUTE format('
      CREATE INDEX IF NOT EXISTS idx_%I_metas_setor_data 
      ON %I.metas_setor(data)', 
      tenant_record.supabase_schema, tenant_record.supabase_schema);

    EXECUTE format('
      CREATE INDEX IF NOT EXISTS idx_%I_metas_setor_filial 
      ON %I.metas_setor(filial_id)', 
      tenant_record.supabase_schema, tenant_record.supabase_schema);

    -- Create updated_at triggers
    EXECUTE format('
      CREATE TRIGGER on_setores_update 
      BEFORE UPDATE ON %I.setores 
      FOR EACH ROW 
      EXECUTE FUNCTION handle_updated_at()', 
      tenant_record.supabase_schema);

    EXECUTE format('
      CREATE TRIGGER on_metas_setor_update 
      BEFORE UPDATE ON %I.metas_setor 
      FOR EACH ROW 
      EXECUTE FUNCTION handle_updated_at()', 
      tenant_record.supabase_schema);

    RAISE NOTICE 'Created metas_setor tables for schema: %', tenant_record.supabase_schema;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT create_metas_setor_tables();

-- Drop the function after use
DROP FUNCTION IF EXISTS create_metas_setor_tables();
