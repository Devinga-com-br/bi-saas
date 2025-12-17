-- ============================================================================
-- FIX: Corrigir Materialized Views vendas_agregadas_60d e vendas_agregadas_30d
-- ============================================================================
-- Data: 2025-12-16
-- Problema: MVs de okilao, demo, lucia estao apontando para schema 'paraiso'
--           ao inves de usar o schema correto
-- Solucao: Recriar as MVs com o schema correto
-- ============================================================================

-- ============================================================================
-- PARTE 1: FUNCAO AUXILIAR PARA VALIDAR MVs
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validar_mv_schemas()
RETURNS TABLE (
  schema_name text,
  mv_name text,
  expected_schema text,
  actual_schema text,
  status text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.schemaname::text,
    m.matviewname::text,
    m.schemaname::text AS expected,
    -- Regex ajustada para capturar schema com ou sem parenteses
    (regexp_match(m.definition, '(?:FROM|from)\s*\(?(\w+)\.vendas', 'i'))[1]::text AS actual,
    CASE
      WHEN m.schemaname = (regexp_match(m.definition, '(?:FROM|from)\s*\(?(\w+)\.vendas', 'i'))[1]
      THEN 'OK'
      ELSE 'ERRADO'
    END AS status
  FROM pg_matviews m
  WHERE m.matviewname IN ('vendas_agregadas_60d', 'vendas_agregadas_30d')
  ORDER BY m.matviewname, m.schemaname;
END;
$$;

COMMENT ON FUNCTION public.validar_mv_schemas() IS
'Valida se todas as MVs vendas_agregadas_60d e vendas_agregadas_30d estao apontando para o schema correto.
Uso: SELECT * FROM public.validar_mv_schemas();';

-- ============================================================================
-- PARTE 2: CORRIGIR MV vendas_agregadas_60d - OKILAO
-- ============================================================================

DROP MATERIALIZED VIEW IF EXISTS okilao.vendas_agregadas_60d CASCADE;

CREATE MATERIALIZED VIEW okilao.vendas_agregadas_60d AS
SELECT
  p.id AS id_produto,
  p.filial_id,
  p.departamento_id,
  SUM(v.valor_vendas) AS total_valor_produto
FROM okilao.vendas v
JOIN okilao.produtos p
  ON v.id_produto = p.id
  AND v.filial_id = p.filial_id
WHERE
  v.data_venda >= (CURRENT_DATE - INTERVAL '60 days')
  AND v.data_venda < CURRENT_DATE
  AND v.valor_vendas > 0
GROUP BY p.id, p.filial_id, p.departamento_id;

CREATE INDEX idx_okilao_vendas_agregadas_60d_produto_filial
ON okilao.vendas_agregadas_60d (id_produto, filial_id);

-- ============================================================================
-- PARTE 3: CORRIGIR MV vendas_agregadas_60d - LUCIA
-- ============================================================================

DROP MATERIALIZED VIEW IF EXISTS lucia.vendas_agregadas_60d CASCADE;

CREATE MATERIALIZED VIEW lucia.vendas_agregadas_60d AS
SELECT
  p.id AS id_produto,
  p.filial_id,
  p.departamento_id,
  SUM(v.valor_vendas) AS total_valor_produto
FROM lucia.vendas v
JOIN lucia.produtos p
  ON v.id_produto = p.id
  AND v.filial_id = p.filial_id
WHERE
  v.data_venda >= (CURRENT_DATE - INTERVAL '60 days')
  AND v.data_venda < CURRENT_DATE
  AND v.valor_vendas > 0
GROUP BY p.id, p.filial_id, p.departamento_id;

CREATE INDEX idx_lucia_vendas_agregadas_60d_produto_filial
ON lucia.vendas_agregadas_60d (id_produto, filial_id);

-- ============================================================================
-- PARTE 4: CORRIGIR MV vendas_agregadas_60d - DEMO
-- ============================================================================

DROP MATERIALIZED VIEW IF EXISTS demo.vendas_agregadas_60d CASCADE;

CREATE MATERIALIZED VIEW demo.vendas_agregadas_60d AS
SELECT
  p.id AS id_produto,
  p.filial_id,
  p.departamento_id,
  SUM(v.valor_vendas) AS total_valor_produto
FROM demo.vendas v
JOIN demo.produtos p
  ON v.id_produto = p.id
  AND v.filial_id = p.filial_id
WHERE
  v.data_venda >= (CURRENT_DATE - INTERVAL '60 days')
  AND v.data_venda < CURRENT_DATE
  AND v.valor_vendas > 0
GROUP BY p.id, p.filial_id, p.departamento_id;

CREATE INDEX idx_demo_vendas_agregadas_60d_produto_filial
ON demo.vendas_agregadas_60d (id_produto, filial_id);

-- ============================================================================
-- PARTE 5: CORRIGIR MV vendas_agregadas_30d - OKILAO (SE EXISTIR)
-- ============================================================================

DROP MATERIALIZED VIEW IF EXISTS okilao.vendas_agregadas_30d CASCADE;

CREATE MATERIALIZED VIEW okilao.vendas_agregadas_30d AS
SELECT
  p.id AS id_produto,
  p.filial_id,
  p.departamento_id,
  SUM(v.valor_vendas) AS total_valor_produto
FROM okilao.vendas v
JOIN okilao.produtos p
  ON v.id_produto = p.id
  AND v.filial_id = p.filial_id
WHERE
  v.data_venda >= (CURRENT_DATE - INTERVAL '30 days')
  AND v.data_venda < CURRENT_DATE
  AND v.valor_vendas > 0
GROUP BY p.id, p.filial_id, p.departamento_id;

CREATE INDEX idx_okilao_vendas_agregadas_30d_produto_filial
ON okilao.vendas_agregadas_30d (id_produto, filial_id);

-- ============================================================================
-- PARTE 6: CORRIGIR MV vendas_agregadas_30d - LUCIA (SE EXISTIR)
-- ============================================================================

DROP MATERIALIZED VIEW IF EXISTS lucia.vendas_agregadas_30d CASCADE;

CREATE MATERIALIZED VIEW lucia.vendas_agregadas_30d AS
SELECT
  p.id AS id_produto,
  p.filial_id,
  p.departamento_id,
  SUM(v.valor_vendas) AS total_valor_produto
FROM lucia.vendas v
JOIN lucia.produtos p
  ON v.id_produto = p.id
  AND v.filial_id = p.filial_id
WHERE
  v.data_venda >= (CURRENT_DATE - INTERVAL '30 days')
  AND v.data_venda < CURRENT_DATE
  AND v.valor_vendas > 0
GROUP BY p.id, p.filial_id, p.departamento_id;

CREATE INDEX idx_lucia_vendas_agregadas_30d_produto_filial
ON lucia.vendas_agregadas_30d (id_produto, filial_id);

-- ============================================================================
-- PARTE 7: CORRIGIR MV vendas_agregadas_30d - DEMO (SE EXISTIR)
-- ============================================================================

DROP MATERIALIZED VIEW IF EXISTS demo.vendas_agregadas_30d CASCADE;

CREATE MATERIALIZED VIEW demo.vendas_agregadas_30d AS
SELECT
  p.id AS id_produto,
  p.filial_id,
  p.departamento_id,
  SUM(v.valor_vendas) AS total_valor_produto
FROM demo.vendas v
JOIN demo.produtos p
  ON v.id_produto = p.id
  AND v.filial_id = p.filial_id
WHERE
  v.data_venda >= (CURRENT_DATE - INTERVAL '30 days')
  AND v.data_venda < CURRENT_DATE
  AND v.valor_vendas > 0
GROUP BY p.id, p.filial_id, p.departamento_id;

CREATE INDEX idx_demo_vendas_agregadas_30d_produto_filial
ON demo.vendas_agregadas_30d (id_produto, filial_id);

-- ============================================================================
-- PARTE 8: VALIDACAO FINAL
-- ============================================================================

-- Executar validacao para confirmar que todas as MVs estao corretas
-- SELECT * FROM public.validar_mv_schemas();

-- ============================================================================
-- INSTRUCOES POS-MIGRATION
-- ============================================================================
-- Apos executar esta migration, rode os seguintes comandos para recalcular os dados:
--
-- 1. Refresh das MVs de 60 dias:
-- SELECT public.refresh_vendas_agregadas_60d('okilao');
-- SELECT public.refresh_vendas_agregadas_60d('lucia');
-- SELECT public.refresh_vendas_agregadas_60d('demo');
--
-- 2. Refresh das MVs de 30 dias:
-- SELECT public.refresh_vendas_agregadas_30d('okilao');
-- SELECT public.refresh_vendas_agregadas_30d('lucia');
-- SELECT public.refresh_vendas_agregadas_30d('demo');
--
-- 3. Recalcular venda media diaria:
-- SELECT public.calcular_venda_media_diaria_60d('okilao');
-- SELECT public.calcular_venda_media_diaria_60d('lucia');
-- SELECT public.calcular_venda_media_diaria_60d('demo');
--
-- 4. Recalcular dias de estoque:
-- SELECT public.atualizar_dias_de_estoque('okilao');
-- SELECT public.atualizar_dias_de_estoque('lucia');
-- SELECT public.atualizar_dias_de_estoque('demo');
--
-- 5. Recalcular dias com venda:
-- SELECT public.atualizar_dias_com_venda_60d('okilao');
-- SELECT public.atualizar_dias_com_venda_60d('lucia');
-- SELECT public.atualizar_dias_com_venda_60d('demo');
-- ============================================================================
