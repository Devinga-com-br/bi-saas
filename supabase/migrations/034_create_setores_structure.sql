-- Migration: Create Setores (Sectors) structure
-- Description: Creates tables for sectors configuration and sector-based goals

-- 1. Create setores table (tenant-specific)
DO $$
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
        id bigserial PRIMARY KEY,
        nome text NOT NULL,
        departamento_nivel smallint NOT NULL CHECK (departamento_nivel BETWEEN 1 AND 6),
        departamento_ids bigint[] NOT NULL,
        ativo boolean NOT NULL DEFAULT true,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT setores_nome_unique UNIQUE (nome)
      )
    ', tenant_record.supabase_schema);

    -- Create metas_setores table
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.metas_setores (
        id bigserial PRIMARY KEY,
        setor_id bigint NOT NULL REFERENCES %I.setores(id) ON DELETE CASCADE,
        filial_id bigint NOT NULL,
        data date NOT NULL,
        dia_semana text NOT NULL,
        meta_percentual numeric(10, 2) NOT NULL,
        data_referencia date NOT NULL,
        valor_referencia numeric(15, 2),
        valor_meta numeric(15, 2),
        valor_realizado numeric(15, 2),
        diferenca numeric(15, 2),
        diferenca_percentual numeric(10, 2),
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT metas_setores_unique UNIQUE (setor_id, filial_id, data)
      )
    ', tenant_record.supabase_schema, tenant_record.supabase_schema);

    -- Create indexes
    EXECUTE format('
      CREATE INDEX IF NOT EXISTS idx_setores_ativo 
      ON %I.setores(ativo) 
      WHERE ativo = true
    ', tenant_record.supabase_schema);

    EXECUTE format('
      CREATE INDEX IF NOT EXISTS idx_metas_setores_setor_data 
      ON %I.metas_setores(setor_id, data, filial_id)
    ', tenant_record.supabase_schema);

    EXECUTE format('
      CREATE INDEX IF NOT EXISTS idx_metas_setores_data 
      ON %I.metas_setores(data, filial_id)
    ', tenant_record.supabase_schema);

    -- Add update triggers
    EXECUTE format('
      DROP TRIGGER IF EXISTS on_setores_update ON %I.setores;
      CREATE TRIGGER on_setores_update 
        BEFORE UPDATE ON %I.setores
        FOR EACH ROW 
        EXECUTE FUNCTION handle_updated_at()
    ', tenant_record.supabase_schema, tenant_record.supabase_schema);

    EXECUTE format('
      DROP TRIGGER IF EXISTS on_metas_setores_update ON %I.metas_setores;
      CREATE TRIGGER on_metas_setores_update 
        BEFORE UPDATE ON %I.metas_setores
        FOR EACH ROW 
        EXECUTE FUNCTION handle_updated_at()
    ', tenant_record.supabase_schema, tenant_record.supabase_schema);

  END LOOP;
END $$;
