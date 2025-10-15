-- Migration: Recreate metas functions without situacao
-- Description: Force recreation of metas functions to remove any reference to situacao

-- Drop and recreate get_metas_mensais_report function
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
