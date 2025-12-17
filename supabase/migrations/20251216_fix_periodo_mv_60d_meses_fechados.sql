-- ============================================================================
-- FIX: Corrigir MVs vendas_agregadas_60d
-- ============================================================================
-- Data: 2025-12-16
--
-- CORRECAO 1: Periodo de 2 meses fechados
--   ANTES: 60 dias corridos (17/10 a 15/12)
--   DEPOIS: 2 meses fechados (01/10 a 30/11)
--
-- CORRECAO 2: Adicionar coluna total_quantidade_produto
--   ANTES: Apenas SUM(valor_vendas) AS total_valor_produto
--   DEPOIS: Ambas colunas:
--     - SUM(valor_vendas) AS total_valor_produto (mantida)
--     - SUM(quantidade) AS total_quantidade_produto (nova)
--
-- CORRECAO 3: Funcao usa nova coluna para calcular venda media
--   venda_media_diaria_60d = total_quantidade_produto / dias
--   Isso permite calcular dias_de_estoque corretamente:
--     dias_de_estoque = estoque_atual / venda_media_diaria_60d
--     Exemplo: 50 unidades / 1.64 un/dia = 30 dias
-- ============================================================================

-- ============================================================================
-- PARTE 1: RECRIAR MV COM NOVO PERIODO - OKILAO
-- ============================================================================

DROP MATERIALIZED VIEW IF EXISTS okilao.vendas_agregadas_60d CASCADE;

CREATE MATERIALIZED VIEW okilao.vendas_agregadas_60d AS
SELECT
  p.id AS id_produto,
  p.filial_id,
  p.departamento_id,
  SUM(v.valor_vendas) AS total_valor_produto,
  SUM(v.quantidade) AS total_quantidade_produto
FROM okilao.vendas v
JOIN okilao.produtos p
  ON v.id_produto = p.id
  AND v.filial_id = p.filial_id
WHERE
  -- Novo periodo: 2 meses anteriores fechados
  v.data_venda >= (date_trunc('month', CURRENT_DATE) - INTERVAL '2 months')::date  -- 01/10/2025
  AND v.data_venda < date_trunc('month', CURRENT_DATE)::date                        -- < 01/12/2025 (ate 30/11)
  AND v.valor_vendas > 0
GROUP BY p.id, p.filial_id, p.departamento_id;

CREATE INDEX idx_okilao_vendas_agregadas_60d_produto_filial
ON okilao.vendas_agregadas_60d (id_produto, filial_id);

-- ============================================================================
-- PARTE 2: RECRIAR MV COM NOVO PERIODO - LUCIA
-- ============================================================================

DROP MATERIALIZED VIEW IF EXISTS lucia.vendas_agregadas_60d CASCADE;

CREATE MATERIALIZED VIEW lucia.vendas_agregadas_60d AS
SELECT
  p.id AS id_produto,
  p.filial_id,
  p.departamento_id,
  SUM(v.valor_vendas) AS total_valor_produto,
  SUM(v.quantidade) AS total_quantidade_produto
FROM lucia.vendas v
JOIN lucia.produtos p
  ON v.id_produto = p.id
  AND v.filial_id = p.filial_id
WHERE
  v.data_venda >= (date_trunc('month', CURRENT_DATE) - INTERVAL '2 months')::date
  AND v.data_venda < date_trunc('month', CURRENT_DATE)::date
  AND v.valor_vendas > 0
GROUP BY p.id, p.filial_id, p.departamento_id;

CREATE INDEX idx_lucia_vendas_agregadas_60d_produto_filial
ON lucia.vendas_agregadas_60d (id_produto, filial_id);

-- ============================================================================
-- PARTE 3: RECRIAR MV COM NOVO PERIODO - PARAISO
-- ============================================================================

DROP MATERIALIZED VIEW IF EXISTS paraiso.vendas_agregadas_60d CASCADE;

CREATE MATERIALIZED VIEW paraiso.vendas_agregadas_60d AS
SELECT
  p.id AS id_produto,
  p.filial_id,
  p.departamento_id,
  SUM(v.valor_vendas) AS total_valor_produto,
  SUM(v.quantidade) AS total_quantidade_produto
FROM paraiso.vendas v
JOIN paraiso.produtos p
  ON v.id_produto = p.id
  AND v.filial_id = p.filial_id
WHERE
  v.data_venda >= (date_trunc('month', CURRENT_DATE) - INTERVAL '2 months')::date
  AND v.data_venda < date_trunc('month', CURRENT_DATE)::date
  AND v.valor_vendas > 0
GROUP BY p.id, p.filial_id, p.departamento_id;

CREATE INDEX idx_paraiso_vendas_agregadas_60d_produto_filial
ON paraiso.vendas_agregadas_60d (id_produto, filial_id);

-- ============================================================================
-- PARTE 4: RECRIAR MV COM NOVO PERIODO - SAOLUIZ
-- ============================================================================

DROP MATERIALIZED VIEW IF EXISTS saoluiz.vendas_agregadas_60d CASCADE;

CREATE MATERIALIZED VIEW saoluiz.vendas_agregadas_60d AS
SELECT
  p.id AS id_produto,
  p.filial_id,
  p.departamento_id,
  SUM(v.valor_vendas) AS total_valor_produto,
  SUM(v.quantidade) AS total_quantidade_produto
FROM saoluiz.vendas v
JOIN saoluiz.produtos p
  ON v.id_produto = p.id
  AND v.filial_id = p.filial_id
WHERE
  v.data_venda >= (date_trunc('month', CURRENT_DATE) - INTERVAL '2 months')::date
  AND v.data_venda < date_trunc('month', CURRENT_DATE)::date
  AND v.valor_vendas > 0
GROUP BY p.id, p.filial_id, p.departamento_id;

CREATE INDEX idx_saoluiz_vendas_agregadas_60d_produto_filial
ON saoluiz.vendas_agregadas_60d (id_produto, filial_id);

-- ============================================================================
-- PARTE 5: RECRIAR MV COM NOVO PERIODO - SOL
-- ============================================================================

DROP MATERIALIZED VIEW IF EXISTS sol.vendas_agregadas_60d CASCADE;

CREATE MATERIALIZED VIEW sol.vendas_agregadas_60d AS
SELECT
  p.id AS id_produto,
  p.filial_id,
  p.departamento_id,
  SUM(v.valor_vendas) AS total_valor_produto,
  SUM(v.quantidade) AS total_quantidade_produto
FROM sol.vendas v
JOIN sol.produtos p
  ON v.id_produto = p.id
  AND v.filial_id = p.filial_id
WHERE
  v.data_venda >= (date_trunc('month', CURRENT_DATE) - INTERVAL '2 months')::date
  AND v.data_venda < date_trunc('month', CURRENT_DATE)::date
  AND v.valor_vendas > 0
GROUP BY p.id, p.filial_id, p.departamento_id;

CREATE INDEX idx_sol_vendas_agregadas_60d_produto_filial
ON sol.vendas_agregadas_60d (id_produto, filial_id);

-- ============================================================================
-- PARTE 6: RECRIAR MV COM NOVO PERIODO - DEMO
-- ============================================================================

DROP MATERIALIZED VIEW IF EXISTS demo.vendas_agregadas_60d CASCADE;

CREATE MATERIALIZED VIEW demo.vendas_agregadas_60d AS
SELECT
  p.id AS id_produto,
  p.filial_id,
  p.departamento_id,
  SUM(v.valor_vendas) AS total_valor_produto,
  SUM(v.quantidade) AS total_quantidade_produto
FROM demo.vendas v
JOIN demo.produtos p
  ON v.id_produto = p.id
  AND v.filial_id = p.filial_id
WHERE
  v.data_venda >= (date_trunc('month', CURRENT_DATE) - INTERVAL '2 months')::date
  AND v.data_venda < date_trunc('month', CURRENT_DATE)::date
  AND v.valor_vendas > 0
GROUP BY p.id, p.filial_id, p.departamento_id;

CREATE INDEX idx_demo_vendas_agregadas_60d_produto_filial
ON demo.vendas_agregadas_60d (id_produto, filial_id);

-- ============================================================================
-- PARTE 7: ATUALIZAR FUNCAO calcular_venda_media_diaria_60d
-- ============================================================================
-- Agora divide pelo numero real de dias (dinamico) ao inves de 60 fixo

CREATE OR REPLACE FUNCTION public.calcular_venda_media_diaria_60d(schema_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  start_time timestamptz := clock_timestamp();
  v_dias_periodo integer;
  v_rows_updated integer;
BEGIN
  SET statement_timeout = '120s';

  -- Calcular numero de dias no periodo (2 meses fechados)
  -- Exemplo: Em dezembro/2025, calcula dias de 01/10 a 30/11 = 61 dias
  v_dias_periodo := (
    (date_trunc('month', CURRENT_DATE) - INTERVAL '1 day')::date  -- ultimo dia mes anterior (30/11)
    -
    (date_trunc('month', CURRENT_DATE) - INTERVAL '2 months')::date  -- primeiro dia 2 meses atras (01/10)
    + 1  -- incluir ambos os dias
  )::integer;

  RAISE NOTICE 'Calculando venda media diaria para schema % com periodo de % dias', schema_name, v_dias_periodo;

  EXECUTE format('
    UPDATE %I.produtos AS p
    SET
      venda_media_diaria_60d = mv.total_quantidade_produto / $1::numeric
    FROM
      %I.vendas_agregadas_60d AS mv
    WHERE
      p.id = mv.id_produto
      AND p.filial_id = mv.filial_id;
  ', schema_name, schema_name)
  USING v_dias_periodo;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  PERFORM public.log_job(
      'calcular_venda_media_diaria_60d',
      schema_name,
      'SUCCESS',
      format('Calculo de QUANTIDADE media diaria (2 meses fechados = %s dias) concluido. %s produtos atualizados.', v_dias_periodo, v_rows_updated),
      start_time
  );

  RETURN format('Calculo concluido para %s: %s produtos atualizados (periodo: %s dias)',
                schema_name, v_rows_updated, v_dias_periodo);

EXCEPTION
    WHEN OTHERS THEN
        PERFORM public.log_job(
            'calcular_venda_media_diaria_60d',
            schema_name,
            'ERROR',
            SQLERRM,
            start_time
        );
        RAISE;
END;
$function$;

COMMENT ON FUNCTION public.calcular_venda_media_diaria_60d(text) IS
'Calcula a venda media diaria em QUANTIDADE (unidades) usando os 2 meses anteriores FECHADOS.
Exemplo: Em dezembro/2025, usa outubro+novembro (61 dias).
Formula: venda_media_diaria = SUM(quantidade) / dias_periodo
IMPORTANTE: Retorna QUANTIDADE media (ex: 1.5 un/dia), NAO valor em R$.';

-- ============================================================================
-- VERIFICACAO
-- ============================================================================

-- Verificar o periodo que sera usado
-- SELECT
--   (date_trunc('month', CURRENT_DATE) - INTERVAL '2 months')::date AS inicio_periodo,
--   (date_trunc('month', CURRENT_DATE) - INTERVAL '1 day')::date AS fim_periodo,
--   (
--     (date_trunc('month', CURRENT_DATE) - INTERVAL '1 day')::date
--     - (date_trunc('month', CURRENT_DATE) - INTERVAL '2 months')::date
--     + 1
--   ) AS total_dias;

-- ============================================================================
-- INSTRUCOES POS-MIGRATION
-- ============================================================================
-- Apos executar esta migration, rode:
--
-- 1. Refresh das MVs:
-- SELECT public.refresh_vendas_agregadas_60d('okilao');
-- SELECT public.refresh_vendas_agregadas_60d('lucia');
-- SELECT public.refresh_vendas_agregadas_60d('paraiso');
-- SELECT public.refresh_vendas_agregadas_60d('saoluiz');
-- SELECT public.refresh_vendas_agregadas_60d('sol');
-- SELECT public.refresh_vendas_agregadas_60d('demo');
--
-- 2. Recalcular venda media diaria:
-- SELECT public.calcular_venda_media_diaria_60d('okilao');
-- SELECT public.calcular_venda_media_diaria_60d('lucia');
-- SELECT public.calcular_venda_media_diaria_60d('paraiso');
-- SELECT public.calcular_venda_media_diaria_60d('saoluiz');
-- SELECT public.calcular_venda_media_diaria_60d('sol');
-- SELECT public.calcular_venda_media_diaria_60d('demo');
-- ============================================================================
