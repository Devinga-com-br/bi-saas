-- Migration: Fix metas date reference logic
-- Description: Calculate reference date properly - use same day from previous year by default

DROP FUNCTION IF EXISTS public.generate_metas_mensais(text, bigint, integer, integer, numeric, date);

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
  v_data_meta date;
  v_data_referencia date;
  v_dia_semana text;
  v_valor_referencia numeric(15, 2);
  v_valor_meta numeric(15, 2);
  v_valor_realizado numeric(15, 2);
  v_diferenca numeric(15, 2);
  v_diferenca_percentual numeric(5, 2);
  v_records_created integer := 0;
  v_first_day date;
  v_last_day date;
  v_day_offset integer;
BEGIN
  -- Calcular primeiro e último dia do mês
  v_first_day := make_date(p_ano, p_mes, 1);
  v_last_day := (v_first_day + interval '1 month - 1 day')::date;
  
  -- Deletar metas existentes para o período e filial
  EXECUTE format('
    DELETE FROM %I.metas_mensais
    WHERE filial_id = $1
      AND EXTRACT(YEAR FROM data) = $2
      AND EXTRACT(MONTH FROM data) = $3
  ', p_schema)
  USING p_filial_id, p_ano, p_mes;
  
  -- Loop para cada dia do mês
  FOR v_data_meta IN 
    SELECT generate_series(v_first_day, v_last_day, '1 day'::interval)::date
  LOOP
    -- Calcular offset de dias desde o início do mês
    v_day_offset := v_data_meta - v_first_day;
    
    -- Calcular data de referência: data inicial + offset de dias
    v_data_referencia := p_data_referencia_inicial + (v_day_offset || ' days')::interval;
    
    -- Obter dia da semana em português
    v_dia_semana := CASE EXTRACT(DOW FROM v_data_meta)
      WHEN 0 THEN 'Domingo'
      WHEN 1 THEN 'Segunda-Feira'
      WHEN 2 THEN 'Terça-Feira'
      WHEN 3 THEN 'Quarta-Feira'
      WHEN 4 THEN 'Quinta-Feira'
      WHEN 5 THEN 'Sexta-Feira'
      WHEN 6 THEN 'Sábado'
    END;
    
    -- Buscar valor de referência (vendas da data de referência)
    EXECUTE format('
      SELECT COALESCE(valor_total, 0)
      FROM %I.vendas_diarias_por_filial
      WHERE filial_id = $1 AND data_venda = $2
    ', p_schema)
    INTO v_valor_referencia
    USING p_filial_id, v_data_referencia;
    
    -- Calcular valor da meta
    v_valor_meta := v_valor_referencia * (1 + (p_meta_percentual / 100));
    
    -- Buscar valor realizado (vendas da data da meta)
    EXECUTE format('
      SELECT COALESCE(valor_total, 0)
      FROM %I.vendas_diarias_por_filial
      WHERE filial_id = $1 AND data_venda = $2
    ', p_schema)
    INTO v_valor_realizado
    USING p_filial_id, v_data_meta;
    
    -- Calcular diferença
    v_diferenca := v_valor_realizado - v_valor_meta;
    
    -- Calcular diferença percentual
    IF v_valor_meta > 0 THEN
      v_diferenca_percentual := (v_diferenca / v_valor_meta) * 100;
    ELSE
      v_diferenca_percentual := 0;
    END IF;
    
    -- Inserir meta
    EXECUTE format('
      INSERT INTO %I.metas_mensais (
        filial_id, data, dia_semana, meta_percentual,
        data_referencia, valor_referencia, valor_meta,
        valor_realizado, diferenca, diferenca_percentual
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ', p_schema)
    USING 
      p_filial_id, v_data_meta, v_dia_semana, p_meta_percentual,
      v_data_referencia, v_valor_referencia, v_valor_meta,
      v_valor_realizado, v_diferenca, v_diferenca_percentual;
    
    v_records_created := v_records_created + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'records_created', v_records_created,
    'filial_id', p_filial_id,
    'mes', p_mes,
    'ano', p_ano
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
