-- ============================================================================
-- FUNÇÃO CORRETA: get_metas_setor_report_optimized
-- Baseado na estrutura real da tabela setores
-- ============================================================================
-- Estrutura confirmada:
-- - departamento_ids: TEXT[] (não integer[])
-- - departamento_nivel: integer (não "nivel")
-- - Schema: saoluiz (ou outro tenant)
-- ============================================================================

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
  v_setor RECORD;
  v_result JSONB;
  v_departamento_ids_int INTEGER[];
BEGIN
  -- Calcular range de datas do mês
  v_date_start := make_date(p_ano, p_mes, 1);
  v_date_end := (v_date_start + INTERVAL '1 month - 1 day')::DATE;

  -- Buscar informações do setor
  EXECUTE format(
    'SELECT id, nome, departamento_ids FROM %I.setores WHERE id = $1',
    p_schema
  ) INTO v_setor USING p_setor_id;

  IF NOT FOUND THEN
    RAISE NOTICE 'Setor % não encontrado no schema %', p_setor_id, p_schema;
    RETURN '[]'::jsonb;
  END IF;

  -- Converter departamento_ids de TEXT[] para INTEGER[]
  -- departamento_ids é ["25", "28"] → precisa virar [25, 28]
  SELECT ARRAY_AGG(dept_id::INTEGER)
  INTO v_departamento_ids_int
  FROM UNNEST(v_setor.departamento_ids) AS dept_id
  WHERE dept_id ~ '^\d+$';  -- Só aceitar números

  IF v_departamento_ids_int IS NULL OR array_length(v_departamento_ids_int, 1) = 0 THEN
    RAISE NOTICE 'Setor % não tem departamentos válidos', p_setor_id;
    RETURN '[]'::jsonb;
  END IF;

  RAISE NOTICE 'Buscando metas para setor %, departamentos: %', v_setor.nome, v_departamento_ids_int;

  -- Montar query principal
  EXECUTE format($query$
    WITH metas_base AS (
      -- Buscar metas do setor
      SELECT
        ms.data,
        ms.filial_id,
        ms.dia_semana,
        ms.data_referencia,
        ms.meta_percentual,
        ms.valor_referencia,
        ms.valor_meta
      FROM %I.metas_setor ms
      WHERE ms.setor_id = $1
        AND ms.data >= $2
        AND ms.data <= $3
        %s
    ),
    vendas_setor AS (
      -- Calcular vendas realizadas por data e filial
      -- Filtrando pelos departamentos do setor
      SELECT
        v.data,
        v.filial_id,
        COALESCE(SUM(v.valor_total_liquido), 0) as valor_realizado
      FROM %I.vendas v
      WHERE v.data >= $2
        AND v.data <= $3
        AND v.departamento_id = ANY($4)
        %s
      GROUP BY v.data, v.filial_id
    ),
    metas_com_vendas AS (
      -- JOIN das metas com vendas realizadas
      SELECT
        mb.data,
        mb.filial_id,
        mb.dia_semana,
        mb.data_referencia,
        TO_CHAR(mb.data_referencia, 'TMDay') as dia_semana_ref,
        mb.valor_referencia,
        mb.meta_percentual,
        mb.valor_meta,
        COALESCE(vs.valor_realizado, 0) as valor_realizado,
        COALESCE(vs.valor_realizado, 0) - mb.valor_meta as diferenca,
        CASE
          WHEN mb.valor_meta > 0 THEN
            ((COALESCE(vs.valor_realizado, 0) - mb.valor_meta) / mb.valor_meta * 100)
          ELSE 0
        END as diferenca_percentual
      FROM metas_base mb
      LEFT JOIN vendas_setor vs
        ON vs.data = mb.data
        AND vs.filial_id = mb.filial_id
    ),
    grouped_by_date AS (
      -- Agrupar por data, criando array de filiais
      SELECT
        mcv.data,
        mcv.dia_semana,
        jsonb_agg(
          jsonb_build_object(
            'filial_id', mcv.filial_id,
            'data_referencia', mcv.data_referencia,
            'dia_semana_ref', mcv.dia_semana_ref,
            'valor_referencia', mcv.valor_referencia,
            'meta_percentual', mcv.meta_percentual,
            'valor_meta', mcv.valor_meta,
            'valor_realizado', mcv.valor_realizado,
            'diferenca', mcv.diferenca,
            'diferenca_percentual', mcv.diferenca_percentual
          ) ORDER BY mcv.filial_id
        ) as filiais
      FROM metas_com_vendas mcv
      GROUP BY mcv.data, mcv.dia_semana
    )
    -- Resultado final: array de objetos por data
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
    p_schema,  -- Schema para metas_setor
    p_schema,  -- Schema para vendas
    CASE WHEN p_filial_ids IS NOT NULL THEN 'AND ms.filial_id = ANY($5)' ELSE '' END,
    CASE WHEN p_filial_ids IS NOT NULL THEN 'AND v.filial_id = ANY($5)' ELSE '' END
  ) INTO v_result
  USING p_setor_id, v_date_start, v_date_end, v_departamento_ids_int, p_filial_ids;

  RETURN COALESCE(v_result, '[]'::jsonb);

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao buscar metas: % - %', SQLERRM, SQLSTATE;
    RETURN '[]'::jsonb;
END;
$$;

-- ============================================================================
-- TESTAR A FUNÇÃO
-- ============================================================================
-- Com setor 6 (HortFruti) - departamento 25
SELECT get_metas_setor_report_optimized(
  'saoluiz',
  6,      -- HortFruti
  11,     -- Novembro
  2024,
  NULL    -- Todas as filiais
);

-- Com múltiplas filiais
SELECT get_metas_setor_report_optimized(
  'saoluiz',
  9,                    -- Loja (com múltiplos departamentos)
  11,
  2024,
  ARRAY[1, 4, 6]::BIGINT[]
);

-- ============================================================================
-- VERIFICAR SE HÁ METAS CADASTRADAS
-- ============================================================================
SELECT
  setor_id,
  filial_id,
  COUNT(*) as total_metas,
  MIN(data) as primeira_meta,
  MAX(data) as ultima_meta
FROM saoluiz.metas_setor
WHERE setor_id IN (6, 7, 8, 9)
  AND EXTRACT(YEAR FROM data) = 2024
GROUP BY setor_id, filial_id
ORDER BY setor_id, filial_id;

-- ============================================================================
-- VERIFICAR SE HÁ VENDAS
-- ============================================================================
SELECT
  departamento_id,
  data,
  filial_id,
  SUM(valor_total_liquido) as total_vendas
FROM saoluiz.vendas
WHERE departamento_id IN (25, 28, 22, 11)  -- Alguns dos departamentos
  AND data >= '2024-11-01'
  AND data < '2024-12-01'
GROUP BY departamento_id, data, filial_id
ORDER BY data, departamento_id
LIMIT 20;

-- ============================================================================
-- REMOVER FUNÇÕES ANTIGAS (APÓS CONFIRMAR QUE A NOVA FUNCIONA)
-- ============================================================================
-- Liste todas as versões existentes
SELECT
    n.nspname as schema,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname LIKE '%get_metas_setor%'
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY n.nspname, p.proname;

-- Para remover versões antigas específicas (execute após validar a nova):
-- DROP FUNCTION IF EXISTS saoluiz.get_metas_setor_report(text, bigint, integer, integer, bigint, bigint[]);
-- DROP FUNCTION IF EXISTS saoluiz.get_metas_setor_report(text, integer, integer, bigint, bigint[]);
-- DROP FUNCTION IF EXISTS saoluiz.get_metas_setores_report(text, integer, integer, bigint, bigint[]);

-- ============================================================================
-- NOTAS IMPORTANTES:
-- ============================================================================
-- 1. departamento_ids é TEXT[] (strings) mas departamento_id em vendas é INTEGER
--    → A função converte TEXT[] para INTEGER[] antes de usar
--
-- 2. Se não houver metas cadastradas, retorna array vazio []
--
-- 3. Se não houver vendas, valor_realizado = 0
--
-- 4. RAISE NOTICE ajuda no debug - veja os logs do Supabase
--
-- 5. A função tem tratamento de erros e retorna [] em vez de falhar
