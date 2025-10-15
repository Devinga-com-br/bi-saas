-- Migration: Fix metas report date filtering
-- Description: Ensure the report only returns data for the specified month

DROP FUNCTION IF EXISTS public.get_metas_mensais_report(text, integer, integer, bigint);

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
  v_data_inicio date;
  v_data_fim date;
BEGIN
  -- Calcular primeiro e último dia do mês
  v_data_inicio := make_date(p_ano, p_mes, 1);
  v_data_fim := (v_data_inicio + interval '1 month' - interval '1 day')::date;
  
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
        WHERE data >= $1 AND data <= $2
        ORDER BY data ASC
      ) m
    ', p_schema)
    INTO v_metas
    USING v_data_inicio, v_data_fim;
  ELSE
    EXECUTE format('
      SELECT jsonb_agg(row_to_json(m))
      FROM (
        SELECT 
          id, filial_id, data, dia_semana, meta_percentual,
          data_referencia, valor_referencia, valor_meta,
          valor_realizado, diferenca, diferenca_percentual
        FROM %I.metas_mensais
        WHERE data >= $1 AND data <= $2
          AND filial_id = $3
        ORDER BY data ASC
      ) m
    ', p_schema)
    INTO v_metas
    USING v_data_inicio, v_data_fim, p_filial_id;
  END IF;
  
  -- Calcular totais até a data atual
  IF p_filial_id IS NULL THEN
    EXECUTE format('
      SELECT 
        COALESCE(SUM(valor_realizado), 0),
        COALESCE(SUM(valor_meta), 0)
      FROM %I.metas_mensais
      WHERE data >= $1 AND data <= $2
        AND data <= CURRENT_DATE
    ', p_schema)
    INTO v_total_realizado, v_total_meta
    USING v_data_inicio, v_data_fim;
  ELSE
    EXECUTE format('
      SELECT 
        COALESCE(SUM(valor_realizado), 0),
        COALESCE(SUM(valor_meta), 0)
      FROM %I.metas_mensais
      WHERE data >= $1 AND data <= $2
        AND filial_id = $3
        AND data <= CURRENT_DATE
    ', p_schema)
    INTO v_total_realizado, v_total_meta
    USING v_data_inicio, v_data_fim, p_filial_id;
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
