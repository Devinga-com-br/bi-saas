-- ==========================================
-- Migration: Criar tabela descontos_venda
-- ==========================================
-- Tabela para registrar descontos aplicados nas vendas por filial e data
-- Permite apenas um desconto por filial por data (unique constraint)
-- ==========================================

-- Função para criar tabela em um schema específico
CREATE OR REPLACE FUNCTION create_descontos_venda_table(schema_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.descontos_venda (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      filial_id integer NOT NULL,
      data_desconto date NOT NULL,
      valor_desconto numeric(10, 2) NOT NULL,
      observacao text NULL,
      created_at timestamp with time zone NULL DEFAULT now(),
      updated_at timestamp with time zone NULL DEFAULT now(),
      created_by uuid NULL,
      CONSTRAINT descontos_venda_pkey PRIMARY KEY (id),
      CONSTRAINT descontos_venda_filial_id_data_desconto_key UNIQUE (filial_id, data_desconto),
      CONSTRAINT descontos_venda_valor_desconto_check CHECK (valor_desconto >= 0)
    )
  ', schema_name);

  -- Criar índices
  EXECUTE format('
    CREATE INDEX IF NOT EXISTS idx_descontos_venda_filial 
    ON %I.descontos_venda USING btree (filial_id)
  ', schema_name);

  EXECUTE format('
    CREATE INDEX IF NOT EXISTS idx_descontos_venda_data 
    ON %I.descontos_venda USING btree (data_desconto)
  ', schema_name);

  EXECUTE format('
    CREATE INDEX IF NOT EXISTS idx_descontos_venda_filial_data 
    ON %I.descontos_venda USING btree (filial_id, data_desconto)
  ', schema_name);

  -- Criar trigger para atualizar updated_at
  EXECUTE format('
    CREATE TRIGGER on_descontos_venda_update
    BEFORE UPDATE ON %I.descontos_venda
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at()
  ', schema_name);

  RAISE NOTICE 'Tabela descontos_venda criada no schema %', schema_name;
END;
$$;

-- Aplicar em todos os schemas existentes
DO $$
DECLARE
  tenant_record RECORD;
BEGIN
  FOR tenant_record IN 
    SELECT supabase_schema 
    FROM public.tenants 
    WHERE supabase_schema IS NOT NULL
  LOOP
    PERFORM create_descontos_venda_table(tenant_record.supabase_schema);
  END LOOP;
END $$;

-- Comentários
COMMENT ON FUNCTION create_descontos_venda_table IS 'Cria tabela descontos_venda em um schema específico com índices e constraints';

-- Exemplo de uso para novos schemas:
-- SELECT create_descontos_venda_table('novo_schema');
