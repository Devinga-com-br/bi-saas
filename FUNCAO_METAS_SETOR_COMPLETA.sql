-- ============================================================================
-- FUNÇÃO COMPLETA: get_metas_setor_report_optimized
-- Retorna TODOS os campos da tabela metas_setor
-- ============================================================================

DROP FUNCTION IF EXISTS get_metas_setor_report_optimized(text, bigint, integer, integer, bigint[]);

CREATE OR REPLACE FUNCTION get_metas_setor_report_optimized(
  p_schema TEXT,
  p_setor_id BIGINT,
  p_mes INT,
  p_ano INT,
  p_filial_ids BIGINT[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SET statement_timeout = '30s'
AS $$
DECLARE
  v_date_start DATE;
  v_date_end DATE;
  v_result JSONB;
BEGIN
  -- Calcular range de datas do mês
  v_date_start := make_date(p_ano, p_mes, 1);
  v_date_end := (v_date_start + INTERVAL '1 month - 1 day')::DATE;

  RAISE NOTICE '[METAS_SETOR] Buscando setor_id=%, mes=%, ano=%, filiais=%',
    p_setor_id, p_mes, p_ano, p_filial_ids;

  -- Buscar metas com TODOS os campos
  EXECUTE format($query$
    WITH metas_filtradas AS (
      SELECT
        ms.data,
        ms.filial_id,
        ms.dia_semana,
        ms.data_referencia,
        ms.dia_semana_ref,
        ms.valor_referencia,
        ms.meta_percentual,
        ms.valor_meta,
        COALESCE(ms.valor_realizado, 0) as valor_realizado,
        COALESCE(ms.diferenca, 0) as diferenca,
        COALESCE(ms.diferenca_percentual, 0) as diferenca_percentual
      FROM %I.metas_setor ms
      WHERE ms.setor_id = $1
        AND ms.data >= $2
        AND ms.data <= $3
        %s
    ),
    grouped_by_date AS (
      -- Agrupar por data, criando array de filiais
      SELECT
        mf.data,
        mf.dia_semana,
        jsonb_agg(
          jsonb_build_object(
            'filial_id', mf.filial_id,
            'data_referencia', mf.data_referencia,
            'dia_semana_ref', mf.dia_semana_ref,
            'valor_referencia', mf.valor_referencia,
            'meta_percentual', mf.meta_percentual,
            'valor_meta', mf.valor_meta,
            'valor_realizado', mf.valor_realizado,
            'diferenca', mf.diferenca,
            'diferenca_percentual', mf.diferenca_percentual
          ) ORDER BY mf.filial_id
        ) as filiais
      FROM metas_filtradas mf
      GROUP BY mf.data, mf.dia_semana
    )
    -- Resultado final
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'data', gbd.data,
          'dia_semana', gbd.dia_semana,
          'filiais', gbd.filiais
        ) ORDER BY gbd.data
      ),
      '[]'::jsonb
    )
    FROM grouped_by_date gbd
  $query$,
    p_schema,
    CASE WHEN p_filial_ids IS NOT NULL THEN 'AND ms.filial_id = ANY($4)' ELSE '' END
  ) INTO v_result
  USING p_setor_id, v_date_start, v_date_end, p_filial_ids;

  RAISE NOTICE '[METAS_SETOR] Resultado: % caracteres', LENGTH(v_result::text);

  RETURN COALESCE(v_result, '[]'::jsonb);

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '[METAS_SETOR] Erro: % - %', SQLERRM, SQLSTATE;
    RETURN '[]'::jsonb;
END;
$$;

-- ============================================================================
-- TESTE
-- ============================================================================
SELECT get_metas_setor_report_optimized(
  'saoluiz',
  8,                  -- Açougue
  11,                 -- Novembro
  2025,
  ARRAY[10]::BIGINT[] -- Apenas filial 10
);
