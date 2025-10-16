-- Migration: Fix get_metas_setor_report function
-- Description: Recreate function to ensure it exists with correct signature

-- Drop existing function if exists
DROP FUNCTION IF EXISTS public.get_metas_setor_report(TEXT, BIGINT, INT, INT, BIGINT);
DROP FUNCTION IF EXISTS public.get_metas_setor_report(TEXT, INT, INT, BIGINT);

-- Recreate function with correct signature
CREATE OR REPLACE FUNCTION public.get_metas_setor_report(
  p_schema TEXT,
  p_setor_id BIGINT,
  p_mes INT,
  p_ano INT,
  p_filial_id BIGINT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  IF p_filial_id IS NOT NULL THEN
    -- Retornar metas de uma filial específica
    EXECUTE format('
      SELECT COALESCE(json_agg(day_data ORDER BY data), ''[]''::json)
      FROM (
        SELECT 
          data,
          dia_semana,
          json_agg(
            json_build_object(
              ''filial_id'', filial_id,
              ''data_referencia'', data_referencia,
              ''dia_semana_ref'', dia_semana_ref,
              ''valor_referencia'', valor_referencia,
              ''meta_percentual'', meta_percentual,
              ''valor_meta'', valor_meta,
              ''valor_realizado'', valor_realizado,
              ''diferenca'', diferenca,
              ''diferenca_percentual'', diferenca_percentual
            ) ORDER BY filial_id
          ) as filiais
        FROM %I.metas_setor
        WHERE setor_id = $1
          AND filial_id = $2
          AND EXTRACT(MONTH FROM data) = $3
          AND EXTRACT(YEAR FROM data) = $4
        GROUP BY data, dia_semana
      ) day_data
    ', p_schema)
    INTO v_result
    USING p_setor_id, p_filial_id, p_mes, p_ano;
  ELSE
    -- Retornar metas de todas as filiais
    EXECUTE format('
      SELECT COALESCE(json_agg(day_data ORDER BY data), ''[]''::json)
      FROM (
        SELECT 
          data,
          MAX(dia_semana) as dia_semana,
          json_agg(
            json_build_object(
              ''filial_id'', filial_id,
              ''data_referencia'', data_referencia,
              ''dia_semana_ref'', dia_semana_ref,
              ''valor_referencia'', valor_referencia,
              ''meta_percentual'', meta_percentual,
              ''valor_meta'', valor_meta,
              ''valor_realizado'', valor_realizado,
              ''diferenca'', diferenca,
              ''diferenca_percentual'', diferenca_percentual
            ) ORDER BY filial_id
          ) as filiais
        FROM %I.metas_setor
        WHERE setor_id = $1
          AND EXTRACT(MONTH FROM data) = $2
          AND EXTRACT(YEAR FROM data) = $3
        GROUP BY data
      ) day_data
    ', p_schema)
    INTO v_result
    USING p_setor_id, p_mes, p_ano;
  END IF;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_metas_setor_report TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_metas_setor_report TO anon;
