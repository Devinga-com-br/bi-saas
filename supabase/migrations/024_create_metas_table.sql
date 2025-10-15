-- Migration: Create metas_mensais table per schema
-- Description: Create table for monthly goals tracking per branch

-- Create function to add metas_mensais table to a tenant schema
CREATE OR REPLACE FUNCTION public.create_metas_table_for_tenant(schema_name text)
RETURNS void AS $$
BEGIN
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.metas_mensais (
      id bigserial PRIMARY KEY,
      filial_id bigint NOT NULL,
      data date NOT NULL,
      dia_semana text NOT NULL,
      meta_percentual numeric(5, 2) NOT NULL DEFAULT 0,
      data_referencia date NOT NULL,
      valor_referencia numeric(15, 2) DEFAULT 0,
      valor_meta numeric(15, 2) DEFAULT 0,
      valor_realizado numeric(15, 2) DEFAULT 0,
      diferenca numeric(15, 2) DEFAULT 0,
      diferenca_percentual numeric(5, 2) DEFAULT 0,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      CONSTRAINT metas_mensais_unique_filial_data UNIQUE (filial_id, data)
    );
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_metas_mensais_filial_data 
      ON %I.metas_mensais(filial_id, data);
    
    CREATE INDEX IF NOT EXISTS idx_metas_mensais_data 
      ON %I.metas_mensais(data);
    
    -- Create trigger for updated_at
    CREATE TRIGGER on_metas_mensais_update 
      BEFORE UPDATE ON %I.metas_mensais
      FOR EACH ROW 
      EXECUTE FUNCTION handle_updated_at();
  ', schema_name, schema_name, schema_name, schema_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to generate monthly goals
CREATE OR REPLACE FUNCTION public.generate_metas_mensais(
  p_schema text,
  p_filial_id bigint,
  p_mes integer,
  p_ano integer,
  p_meta_percentual numeric,
  p_data_referencia_inicial date
)
RETURNS jsonb AS $$
DECLARE
  v_data date;
  v_data_referencia date;
  v_dia_semana text;
  v_valor_referencia numeric(15, 2);
  v_valor_meta numeric(15, 2);
  v_valor_realizado numeric(15, 2);
  v_diferenca numeric(15, 2);
  v_diferenca_percentual numeric(5, 2);
  v_dias_processados integer := 0;
BEGIN
  -- Validar parâmetros
  IF p_mes < 1 OR p_mes > 12 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Mês inválido');
  END IF;
  
  IF p_ano < 2000 OR p_ano > 2100 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Ano inválido');
  END IF;
  
  -- Iniciar data e data de referência
  v_data := make_date(p_ano, p_mes, 1);
  v_data_referencia := p_data_referencia_inicial;
  
  -- Loop pelos dias do mês
  WHILE EXTRACT(MONTH FROM v_data) = p_mes LOOP
    -- Obter dia da semana em português
    v_dia_semana := CASE EXTRACT(DOW FROM v_data)
      WHEN 0 THEN 'Domingo'
      WHEN 1 THEN 'Segunda-Feira'
      WHEN 2 THEN 'Terça-Feira'
      WHEN 3 THEN 'Quarta-Feira'
      WHEN 4 THEN 'Quinta-Feira'
      WHEN 5 THEN 'Sexta-Feira'
      WHEN 6 THEN 'Sábado'
    END;
    
    -- Buscar valor de referência do ano anterior
    EXECUTE format('
      SELECT COALESCE(valor_total, 0)
      FROM %I.vendas_diarias_por_filial
      WHERE filial_id = $1 AND data_venda = $2
    ', p_schema)
    INTO v_valor_referencia
    USING p_filial_id, v_data_referencia;
    
    -- Calcular valor meta
    v_valor_meta := v_valor_referencia * (1 + (p_meta_percentual / 100));
    
    -- Buscar valor realizado
    EXECUTE format('
      SELECT COALESCE(valor_total, 0)
      FROM %I.vendas_diarias_por_filial
      WHERE filial_id = $1 AND data_venda = $2
    ', p_schema)
    INTO v_valor_realizado
    USING p_filial_id, v_data;
    
    -- Calcular diferença
    v_diferenca := v_valor_realizado - v_valor_meta;
    
    -- Calcular diferença percentual
    IF v_valor_meta > 0 THEN
      v_diferenca_percentual := (v_diferenca / v_valor_meta) * 100;
    ELSE
      v_diferenca_percentual := 0;
    END IF;
    
    -- Inserir ou atualizar meta
    EXECUTE format('
      INSERT INTO %I.metas_mensais (
        filial_id, data, dia_semana, meta_percentual, data_referencia,
        valor_referencia, valor_meta, valor_realizado, diferenca,
        diferenca_percentual
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (filial_id, data)
      DO UPDATE SET
        dia_semana = EXCLUDED.dia_semana,
        meta_percentual = EXCLUDED.meta_percentual,
        data_referencia = EXCLUDED.data_referencia,
        valor_referencia = EXCLUDED.valor_referencia,
        valor_meta = EXCLUDED.valor_meta,
        valor_realizado = EXCLUDED.valor_realizado,
        diferenca = EXCLUDED.diferenca,
        diferenca_percentual = EXCLUDED.diferenca_percentual,
        updated_at = now()
    ', p_schema)
    USING p_filial_id, v_data, v_dia_semana, p_meta_percentual, v_data_referencia,
          v_valor_referencia, v_valor_meta, v_valor_realizado, v_diferenca,
          v_diferenca_percentual;
    
    v_dias_processados := v_dias_processados + 1;
    
    -- Avançar para o próximo dia
    v_data := v_data + interval '1 day';
    v_data_referencia := v_data_referencia + interval '1 day';
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Metas geradas com sucesso',
    'dias_processados', v_dias_processados
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get monthly goals report
CREATE OR REPLACE FUNCTION public.get_metas_mensais_report(
  p_schema text,
  p_mes integer,
  p_ano integer,
  p_filial_id bigint DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_metas jsonb;
  v_total_realizado numeric(15, 2);
  v_total_meta numeric(15, 2);
  v_percentual_atingido numeric(5, 2);
BEGIN
  -- Buscar metas do período
  IF p_filial_id IS NULL THEN
    EXECUTE format('
      SELECT jsonb_agg(row_to_json(m))
      FROM (
        SELECT 
          id, filial_id, data, dia_semana, meta_percentual,
          data_referencia, valor_referencia, valor_meta,
          valor_realizado, diferenca, diferenca_percentual
        FROM %I.metas_mensais
        WHERE EXTRACT(YEAR FROM data) = $1
          AND EXTRACT(MONTH FROM data) = $2
        ORDER BY data ASC
      ) m
    ', p_schema)
    INTO v_metas
    USING p_ano, p_mes;
  ELSE
    EXECUTE format('
      SELECT jsonb_agg(row_to_json(m))
      FROM (
        SELECT 
          id, filial_id, data, dia_semana, meta_percentual,
          data_referencia, valor_referencia, valor_meta,
          valor_realizado, diferenca, diferenca_percentual
        FROM %I.metas_mensais
        WHERE EXTRACT(YEAR FROM data) = $1
          AND EXTRACT(MONTH FROM data) = $2
          AND filial_id = $3
        ORDER BY data ASC
      ) m
    ', p_schema)
    INTO v_metas
    USING p_ano, p_mes, p_filial_id;
  END IF;
  
  -- Calcular totais até a data atual
  IF p_filial_id IS NULL THEN
    EXECUTE format('
      SELECT 
        COALESCE(SUM(valor_realizado), 0),
        COALESCE(SUM(valor_meta), 0)
      FROM %I.metas_mensais
      WHERE EXTRACT(YEAR FROM data) = $1
        AND EXTRACT(MONTH FROM data) = $2
        AND data <= CURRENT_DATE
    ', p_schema)
    INTO v_total_realizado, v_total_meta
    USING p_ano, p_mes;
  ELSE
    EXECUTE format('
      SELECT 
        COALESCE(SUM(valor_realizado), 0),
        COALESCE(SUM(valor_meta), 0)
      FROM %I.metas_mensais
      WHERE EXTRACT(YEAR FROM data) = $1
        AND EXTRACT(MONTH FROM data) = $2
        AND filial_id = $3
        AND data <= CURRENT_DATE
    ', p_schema)
    INTO v_total_realizado, v_total_meta
    USING p_ano, p_mes, p_filial_id;
  END IF;
  
  -- Calcular percentual atingido
  IF v_total_meta > 0 THEN
    v_percentual_atingido := (v_total_realizado / v_total_meta) * 100;
  ELSE
    v_percentual_atingido := 0;
  END IF;
  
  -- Montar resultado
  v_result := jsonb_build_object(
    'metas', COALESCE(v_metas, '[]'::jsonb),
    'total_realizado', v_total_realizado,
    'total_meta', v_total_meta,
    'percentual_atingido', v_percentual_atingido
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply to existing tenant schemas
DO $$
DECLARE
  tenant_record RECORD;
BEGIN
  FOR tenant_record IN 
    SELECT supabase_schema 
    FROM public.tenants 
    WHERE supabase_schema IS NOT NULL
  LOOP
    PERFORM public.create_metas_table_for_tenant(tenant_record.supabase_schema);
  END LOOP;
END $$;
