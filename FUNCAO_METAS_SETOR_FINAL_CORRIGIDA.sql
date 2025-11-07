-- ============================================================================
-- FUNÇÃO FINAL CORRIGIDA: get_metas_setor_report_optimized
-- Correções:
-- 1. Dia da semana em português
-- 2. Adicionar campos faltantes: data_referencia, dia_semana_ref, valor_referencia, meta_percentual
-- ============================================================================

-- REMOVER VERSÃO ANTIGA
DROP FUNCTION IF EXISTS get_metas_setor_report_optimized(text, bigint, integer, integer, bigint[]);

-- CRIAR FUNÇÃO CORRIGIDA
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
  -- Configurar locale para português
  SET lc_time = 'pt_BR.UTF-8';

  -- Calcular range de datas do mês
  v_date_start := make_date(p_ano, p_mes, 1);
  v_date_end := (v_date_start + INTERVAL '1 month - 1 day')::DATE;

  RAISE NOTICE '[METAS_SETOR] Buscando setor_id=%, mes=%, ano=%, filiais=%',
    p_setor_id, p_mes, p_ano, p_filial_ids;

  -- Buscar metas já com valores realizados
  EXECUTE format($query$
    WITH metas_filtradas AS (
      SELECT
        ms.data,
        ms.filial_id,
        ms.data_referencia,
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
        CASE EXTRACT(DOW FROM mf.data)
          WHEN 0 THEN 'Domingo'
          WHEN 1 THEN 'Segunda'
          WHEN 2 THEN 'Terça'
          WHEN 3 THEN 'Quarta'
          WHEN 4 THEN 'Quinta'
          WHEN 5 THEN 'Sexta'
          WHEN 6 THEN 'Sábado'
        END as dia_semana,
        jsonb_agg(
          jsonb_build_object(
            'filial_id', mf.filial_id,
            'data_referencia', mf.data_referencia,
            'dia_semana_ref', CASE EXTRACT(DOW FROM mf.data_referencia)
              WHEN 0 THEN 'Domingo'
              WHEN 1 THEN 'Segunda'
              WHEN 2 THEN 'Terça'
              WHEN 3 THEN 'Quarta'
              WHEN 4 THEN 'Quinta'
              WHEN 5 THEN 'Sexta'
              WHEN 6 THEN 'Sábado'
            END,
            'valor_referencia', mf.valor_referencia,
            'meta_percentual', mf.meta_percentual,
            'valor_meta', mf.valor_meta,
            'valor_realizado', mf.valor_realizado,
            'diferenca', mf.diferenca,
            'diferenca_percentual', mf.diferenca_percentual
          ) ORDER BY mf.filial_id
        ) as filiais
      FROM metas_filtradas mf
      GROUP BY mf.data
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
  8,      -- Açougue
  11,     -- Novembro
  2025,
  ARRAY[10, 18, 44, 64, 66, 77]::BIGINT[]
);

-- Verificar se os campos estão corretos
SELECT
  data,
  data_referencia,
  valor_referencia,
  meta_percentual,
  valor_meta
FROM saoluiz.metas_setor
WHERE setor_id = 8
  AND data >= '2025-11-01'
  AND data <= '2025-11-30'
ORDER BY data
LIMIT 5;
