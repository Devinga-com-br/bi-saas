-- ============================================================================
-- FUNÇÃO CORRETA: get_metas_setor_report_optimized
-- COM HIERARQUIA DE DEPARTAMENTOS (6 NÍVEIS)
-- ============================================================================
-- REGRA DE NEGÓCIO:
-- 1. Setores têm departamento_ids (códigos) e departamento_nivel (1-6)
-- 2. Precisa buscar TODOS os departamentos nível 1 que pertencem ao nível especificado
-- 3. Exemplo: Setor "Açougue" tem ["22"] no nível 5
--    → Buscar todos os level_1 onde pai_level_5_id = 22
-- 4. Somar vendas de todos os produtos desses departamentos nível 1
-- ============================================================================

-- PRIMEIRO: REMOVER TODAS AS VERSÕES ANTIGAS
DROP FUNCTION IF EXISTS get_metas_setor_report_optimized(text, bigint, integer, integer, bigint[]);
DROP FUNCTION IF EXISTS get_metas_setor_report(text, bigint, integer, integer, bigint, bigint[]);
DROP FUNCTION IF EXISTS get_metas_setor_report(text, integer, integer, bigint, bigint[]);
DROP FUNCTION IF EXISTS get_metas_setores_report(text, integer, integer, bigint, bigint[]);

-- ============================================================================
-- CRIAR FUNÇÃO CORRETA
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
  v_departamento_ids_int BIGINT[];
  v_nivel INTEGER;
BEGIN
  -- Calcular range de datas do mês
  v_date_start := make_date(p_ano, p_mes, 1);
  v_date_end := (v_date_start + INTERVAL '1 month - 1 day')::DATE;

  -- Buscar informações do setor
  EXECUTE format(
    'SELECT id, nome, departamento_ids, departamento_nivel FROM %I.setores WHERE id = $1 AND ativo = true',
    p_schema
  ) INTO v_setor USING p_setor_id;

  IF NOT FOUND THEN
    RAISE NOTICE '[META_SETOR] Setor % não encontrado ou inativo no schema %', p_setor_id, p_schema;
    RETURN '[]'::jsonb;
  END IF;

  v_nivel := v_setor.departamento_nivel;

  -- Converter departamento_ids de TEXT[] para BIGINT[]
  SELECT ARRAY_AGG(dept_id::BIGINT)
  INTO v_departamento_ids_int
  FROM UNNEST(v_setor.departamento_ids) AS dept_id
  WHERE dept_id ~ '^\d+$';

  IF v_departamento_ids_int IS NULL OR array_length(v_departamento_ids_int, 1) = 0 THEN
    RAISE NOTICE '[META_SETOR] Setor % (%) não tem departamentos válidos', p_setor_id, v_setor.nome;
    RETURN '[]'::jsonb;
  END IF;

  RAISE NOTICE '[META_SETOR] Setor: %, Nível: %, Departamentos: %', v_setor.nome, v_nivel, v_departamento_ids_int;

  -- Montar query dinâmica baseada no nível
  EXECUTE format($query$
    WITH departamentos_nivel_1 AS (
      -- Buscar TODOS os departamentos nível 1 que pertencem aos códigos do setor
      SELECT DISTINCT dl1.departamento_id
      FROM %I.departments_level_1 dl1
      WHERE
        CASE $1  -- v_nivel
          WHEN 1 THEN dl1.departamento_id = ANY($2)
          WHEN 2 THEN dl1.pai_level_2_id = ANY($2)
          WHEN 3 THEN dl1.pai_level_3_id = ANY($2)
          WHEN 4 THEN dl1.pai_level_4_id = ANY($2)
          WHEN 5 THEN dl1.pai_level_5_id = ANY($2)
          WHEN 6 THEN dl1.pai_level_6_id = ANY($2)
          ELSE FALSE
        END
    ),
    metas_base AS (
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
      WHERE ms.setor_id = $3
        AND ms.data >= $4
        AND ms.data <= $5
        %s
    ),
    vendas_setor AS (
      -- Calcular vendas realizadas
      -- JOIN: vendas → produtos → departamentos_nivel_1
      SELECT
        v.data,
        v.filial_id,
        COALESCE(SUM(v.valor_total_liquido), 0) as valor_realizado
      FROM %I.vendas v
      INNER JOIN %I.produtos p
        ON p.id = v.id_produto
        AND p.filial_id = v.filial_id
      INNER JOIN departamentos_nivel_1 dn1
        ON dn1.departamento_id = p.departamento_id
      WHERE v.data >= $4
        AND v.data <= $5
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
    p_schema,  -- departments_level_1
    p_schema,  -- metas_setor
    CASE WHEN p_filial_ids IS NOT NULL THEN 'AND ms.filial_id = ANY($6)' ELSE '' END,
    p_schema,  -- vendas
    p_schema,  -- produtos
    CASE WHEN p_filial_ids IS NOT NULL THEN 'AND v.filial_id = ANY($6)' ELSE '' END
  ) INTO v_result
  USING v_nivel, v_departamento_ids_int, p_setor_id, v_date_start, v_date_end, p_filial_ids;

  RETURN COALESCE(v_result, '[]'::jsonb);

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '[META_SETOR] Erro: % - %', SQLERRM, SQLSTATE;
    RETURN '[]'::jsonb;
END;
$$;

-- ============================================================================
-- CRIAR ÍNDICES PARA PERFORMANCE (executar para cada schema)
-- ============================================================================
-- ⚠️ SUBSTITUA 'saoluiz' pelo schema do seu tenant

-- Índice na tabela departments_level_1 para acelerar buscas hierárquicas
CREATE INDEX IF NOT EXISTS idx_departments_level_1_pai_level_2
  ON saoluiz.departments_level_1(pai_level_2_id) WHERE pai_level_2_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_departments_level_1_pai_level_3
  ON saoluiz.departments_level_1(pai_level_3_id) WHERE pai_level_3_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_departments_level_1_pai_level_4
  ON saoluiz.departments_level_1(pai_level_4_id) WHERE pai_level_4_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_departments_level_1_pai_level_5
  ON saoluiz.departments_level_1(pai_level_5_id) WHERE pai_level_5_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_departments_level_1_pai_level_6
  ON saoluiz.departments_level_1(pai_level_6_id) WHERE pai_level_6_id IS NOT NULL;

-- Índice composto em produtos (já existe, verificar)
CREATE INDEX IF NOT EXISTS idx_produtos_filial_departamento
  ON saoluiz.produtos(filial_id, departamento_id);

-- Índice composto em vendas
CREATE INDEX IF NOT EXISTS idx_vendas_data_filial_produto
  ON saoluiz.vendas(data, filial_id, id_produto);

-- Atualizar estatísticas
ANALYZE saoluiz.departments_level_1;
ANALYZE saoluiz.produtos;
ANALYZE saoluiz.vendas;
ANALYZE saoluiz.metas_setor;

-- ============================================================================
-- TESTES
-- ============================================================================
-- 1. Verificar departamentos nível 1 do setor Açougue (código 22, nível 5)
SELECT COUNT(*) as total_departamentos_nivel_1
FROM saoluiz.departments_level_1
WHERE pai_level_5_id = 22;

-- 2. Ver alguns produtos do setor
SELECT p.id, p.filial_id, p.departamento_id, p.descricao
FROM saoluiz.produtos p
INNER JOIN saoluiz.departments_level_1 dl1
  ON dl1.departamento_id = p.departamento_id
WHERE dl1.pai_level_5_id = 22
LIMIT 10;

-- 3. Testar a função
SELECT get_metas_setor_report_optimized(
  'saoluiz',
  8,      -- Açougue (departamento 22, nível 5)
  11,     -- Novembro
  2024,
  NULL    -- Todas as filiais
);

-- 4. Testar com HortFruti
SELECT get_metas_setor_report_optimized(
  'saoluiz',
  6,      -- HortFruti (departamento 25, nível 5)
  11,
  2024,
  NULL
);

-- 5. Testar com filtro de filiais
SELECT get_metas_setor_report_optimized(
  'saoluiz',
  9,                    -- Loja (múltiplos departamentos)
  11,
  2024,
  ARRAY[1, 4, 6]::BIGINT[]
);

-- ============================================================================
-- VERIFICAÇÕES
-- ============================================================================
-- Verificar se há metas cadastradas
SELECT
  s.nome as setor,
  ms.filial_id,
  COUNT(*) as total_metas,
  MIN(ms.data) as primeira_meta,
  MAX(ms.data) as ultima_meta
FROM saoluiz.metas_setor ms
JOIN saoluiz.setores s ON s.id = ms.setor_id
WHERE EXTRACT(YEAR FROM ms.data) = 2024
  AND EXTRACT(MONTH FROM ms.data) = 11
GROUP BY s.nome, ms.filial_id
ORDER BY s.nome, ms.filial_id;

-- Verificar se há vendas para os departamentos do setor
WITH setor_departamentos AS (
  SELECT dl1.departamento_id
  FROM saoluiz.departments_level_1 dl1
  WHERE dl1.pai_level_5_id = 22  -- Açougue
)
SELECT
  v.data,
  v.filial_id,
  COUNT(DISTINCT v.id_produto) as total_produtos,
  SUM(v.valor_total_liquido) as total_vendas
FROM saoluiz.vendas v
INNER JOIN saoluiz.produtos p ON p.id = v.id_produto AND p.filial_id = v.filial_id
INNER JOIN setor_departamentos sd ON sd.departamento_id = p.departamento_id
WHERE v.data >= '2024-11-01'
  AND v.data < '2024-12-01'
GROUP BY v.data, v.filial_id
ORDER BY v.data, v.filial_id
LIMIT 20;

-- ============================================================================
-- LOGS DE DEBUG
-- ============================================================================
-- Para ver os logs RAISE NOTICE, verifique:
-- - Supabase Dashboard → Database → Logs
-- - Ou execute SET client_min_messages = 'NOTICE'; antes da chamada
