-- =====================================================
-- Migration: Fix Cupons and SKU source tables
-- Created: 2026-01-10
-- Description: Corrige fonte de dados de Cupons e SKU
--              ANTES: vendas_hoje/vendas_hoje_itens (temporárias, zeram diariamente)
--              DEPOIS: resumo_vendas_caixa (permanente, com histórico)
--              Campos: qtde_cupons e qtde_produtos
-- =====================================================

-- Drop função existente
DROP FUNCTION IF EXISTS public.get_vendas_por_filial(TEXT, DATE, DATE, TEXT, TEXT);

-- Criar nova versão com fonte corrigida
CREATE OR REPLACE FUNCTION public.get_vendas_por_filial(
  p_schema TEXT,
  p_data_inicio DATE,
  p_data_fim DATE,
  p_filiais TEXT DEFAULT 'all',
  p_filter_type TEXT DEFAULT 'year'
)
RETURNS TABLE (
  filial_id BIGINT,
  valor_total NUMERIC(15,2),
  custo_total NUMERIC(15,2),
  total_lucro NUMERIC(15,2),
  quantidade_total NUMERIC(15,2),
  total_transacoes NUMERIC,
  ticket_medio NUMERIC(15,2),
  margem_lucro NUMERIC(10,2),
  pa_valor_total NUMERIC(15,2),
  pa_custo_total NUMERIC(15,2),
  pa_total_lucro NUMERIC(15,2),
  pa_total_transacoes NUMERIC,
  pa_ticket_medio NUMERIC(15,2),
  pa_margem_lucro NUMERIC(10,2),
  delta_valor NUMERIC(15,2),
  delta_valor_percent NUMERIC(10,2),
  delta_custo NUMERIC(15,2),
  delta_custo_percent NUMERIC(10,2),
  delta_lucro NUMERIC(15,2),
  delta_lucro_percent NUMERIC(10,2),
  delta_margem NUMERIC(10,2),
  total_entradas NUMERIC(15,2),
  pa_total_entradas NUMERIC(15,2),
  delta_entradas NUMERIC(15,2),
  delta_entradas_percent NUMERIC(10,2),
  total_cupons BIGINT,
  pa_total_cupons BIGINT,
  delta_cupons BIGINT,
  delta_cupons_percent NUMERIC(10,2),
  total_sku BIGINT,
  pa_total_sku BIGINT,
  delta_sku BIGINT,
  delta_sku_percent NUMERIC(10,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pa_data_inicio DATE;
  v_pa_data_fim DATE;
  v_filiais_condition TEXT;
BEGIN
  -- Calcular período anterior baseado no tipo de filtro
  IF p_filter_type = 'month' THEN
    v_pa_data_inicio := p_data_inicio - INTERVAL '1 year';
    v_pa_data_fim := p_data_fim - INTERVAL '1 year';
  ELSIF p_filter_type = 'year' THEN
    v_pa_data_inicio := p_data_inicio - INTERVAL '1 year';
    v_pa_data_fim := p_data_fim - INTERVAL '1 year';
  ELSE
    v_pa_data_inicio := p_data_inicio - (p_data_fim - p_data_inicio + 1);
    v_pa_data_fim := p_data_inicio - INTERVAL '1 day';
  END IF;

  -- Construir condição de filiais
  IF p_filiais IS NULL OR p_filiais = 'all' OR p_filiais = '' THEN
    v_filiais_condition := '1=1';
  ELSE
    v_filiais_condition := 'filial_id IN (' || p_filiais || ')';
  END IF;

  RETURN QUERY EXECUTE format('
    WITH vendas_diarias AS (
      SELECT
        filial_id,
        data_venda,
        valor_total,
        custo_total,
        total_lucro,
        quantidade_total,
        total_transacoes
      FROM %I.vendas_diarias_por_filial
      WHERE %s
    ),
    descontos AS (
      SELECT
        filial_id,
        data_desconto,
        valor_desconto,
        desconto_custo
      FROM %I.descontos_venda
      WHERE %s
    ),
    entradas AS (
      SELECT
        filial_id,
        data_entrada,
        valor_total
      FROM %I.entradas
      WHERE transacao IN (''P'', ''V'')
        AND %s
    ),
    -- NOVO: Resumo de vendas por caixa (dados permanentes)
    resumo_vendas AS (
      SELECT
        filial_id,
        data,
        qtde_cupons,
        qtde_produtos
      FROM %I.resumo_vendas_caixa
      WHERE %s
    ),
    -- Período Atual
    periodo_atual AS (
      SELECT
        v.filial_id,
        SUM(v.valor_total) as valor_total_bruto,
        SUM(v.custo_total) as custo_total_bruto,
        SUM(v.total_lucro) as total_lucro_bruto,
        SUM(v.quantidade_total) as quantidade_total,
        SUM(v.total_transacoes)::NUMERIC as total_transacoes
      FROM vendas_diarias v
      WHERE v.data_venda BETWEEN $1 AND $2
      GROUP BY v.filial_id
    ),
    descontos_periodo_atual AS (
      SELECT
        d.filial_id,
        COALESCE(SUM(d.valor_desconto), 0) as total_desconto_venda,
        COALESCE(SUM(d.desconto_custo), 0) as total_desconto_custo
      FROM descontos d
      WHERE d.data_desconto BETWEEN $1 AND $2
      GROUP BY d.filial_id
    ),
    entradas_periodo_atual AS (
      SELECT
        e.filial_id,
        COALESCE(SUM(e.valor_total), 0) as total_entradas
      FROM entradas e
      WHERE e.data_entrada BETWEEN $1 AND $2
      GROUP BY e.filial_id
    ),
    -- NOVO: Cupons período atual (SUM de qtde_cupons)
    cupons_periodo_atual AS (
      SELECT
        r.filial_id,
        COALESCE(SUM(r.qtde_cupons), 0) as total_cupons
      FROM resumo_vendas r
      WHERE r.data BETWEEN $1 AND $2
      GROUP BY r.filial_id
    ),
    -- NOVO: SKU período atual (SUM de qtde_produtos)
    sku_periodo_atual AS (
      SELECT
        r.filial_id,
        COALESCE(SUM(r.qtde_produtos), 0) as total_sku
      FROM resumo_vendas r
      WHERE r.data BETWEEN $1 AND $2
      GROUP BY r.filial_id
    ),
    periodo_atual_com_desconto AS (
      SELECT
        pa.filial_id,
        pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0) as valor_total,
        pa.custo_total_bruto - COALESCE(dpa.total_desconto_custo, 0) as custo_total,
        (pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0)) -
        (pa.custo_total_bruto - COALESCE(dpa.total_desconto_custo, 0)) as total_lucro,
        pa.quantidade_total,
        pa.total_transacoes,
        CASE
          WHEN pa.total_transacoes > 0
          THEN (pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0)) / pa.total_transacoes
          ELSE 0
        END as ticket_medio,
        CASE
          WHEN (pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0)) > 0
          THEN (((pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0)) -
                 (pa.custo_total_bruto - COALESCE(dpa.total_desconto_custo, 0)))::NUMERIC /
                (pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0)) * 100)
          ELSE 0
        END as margem_lucro
      FROM periodo_atual pa
      LEFT JOIN descontos_periodo_atual dpa ON pa.filial_id = dpa.filial_id
    ),
    -- Período Anterior
    periodo_anterior AS (
      SELECT
        v.filial_id,
        SUM(v.valor_total) as valor_total_bruto,
        SUM(v.custo_total) as custo_total_bruto,
        SUM(v.total_lucro) as total_lucro_bruto,
        SUM(v.total_transacoes)::NUMERIC as total_transacoes
      FROM vendas_diarias v
      WHERE v.data_venda BETWEEN $3 AND $4
      GROUP BY v.filial_id
    ),
    descontos_periodo_anterior AS (
      SELECT
        d.filial_id,
        COALESCE(SUM(d.valor_desconto), 0) as total_desconto_venda,
        COALESCE(SUM(d.desconto_custo), 0) as total_desconto_custo
      FROM descontos d
      WHERE d.data_desconto BETWEEN $3 AND $4
      GROUP BY d.filial_id
    ),
    entradas_periodo_anterior AS (
      SELECT
        e.filial_id,
        COALESCE(SUM(e.valor_total), 0) as pa_total_entradas
      FROM entradas e
      WHERE e.data_entrada BETWEEN $3 AND $4
      GROUP BY e.filial_id
    ),
    -- NOVO: Cupons período anterior (SUM de qtde_cupons)
    cupons_periodo_anterior AS (
      SELECT
        r.filial_id,
        COALESCE(SUM(r.qtde_cupons), 0) as pa_total_cupons
      FROM resumo_vendas r
      WHERE r.data BETWEEN $3 AND $4
      GROUP BY r.filial_id
    ),
    -- NOVO: SKU período anterior (SUM de qtde_produtos)
    sku_periodo_anterior AS (
      SELECT
        r.filial_id,
        COALESCE(SUM(r.qtde_produtos), 0) as pa_total_sku
      FROM resumo_vendas r
      WHERE r.data BETWEEN $3 AND $4
      GROUP BY r.filial_id
    ),
    periodo_anterior_com_desconto AS (
      SELECT
        pa.filial_id,
        pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0) as pa_valor_total,
        pa.custo_total_bruto - COALESCE(dpa.total_desconto_custo, 0) as pa_custo_total,
        (pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0)) -
        (pa.custo_total_bruto - COALESCE(dpa.total_desconto_custo, 0)) as pa_total_lucro,
        pa.total_transacoes as pa_total_transacoes,
        CASE
          WHEN pa.total_transacoes > 0
          THEN (pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0)) / pa.total_transacoes
          ELSE 0
        END as pa_ticket_medio,
        CASE
          WHEN (pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0)) > 0
          THEN (((pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0)) -
                 (pa.custo_total_bruto - COALESCE(dpa.total_desconto_custo, 0)))::NUMERIC /
                (pa.valor_total_bruto - COALESCE(dpa.total_desconto_venda, 0)) * 100)
          ELSE 0
        END as pa_margem_lucro
      FROM periodo_anterior pa
      LEFT JOIN descontos_periodo_anterior dpa ON pa.filial_id = dpa.filial_id
    ),
    -- Todas as filiais (UNION de todas as fontes)
    todas_filiais AS (
      SELECT DISTINCT filial_id FROM periodo_atual_com_desconto
      UNION
      SELECT DISTINCT filial_id FROM periodo_anterior_com_desconto
      UNION
      SELECT DISTINCT filial_id FROM entradas_periodo_atual
      UNION
      SELECT DISTINCT filial_id FROM entradas_periodo_anterior
      UNION
      SELECT DISTINCT filial_id FROM cupons_periodo_atual
      UNION
      SELECT DISTINCT filial_id FROM cupons_periodo_anterior
      UNION
      SELECT DISTINCT filial_id FROM sku_periodo_atual
      UNION
      SELECT DISTINCT filial_id FROM sku_periodo_anterior
    )
    SELECT
      tf.filial_id as filial_id,
      COALESCE(pc.valor_total, 0)::NUMERIC(15,2) as valor_total,
      COALESCE(pc.custo_total, 0)::NUMERIC(15,2) as custo_total,
      COALESCE(pc.total_lucro, 0)::NUMERIC(15,2) as total_lucro,
      COALESCE(pc.quantidade_total, 0)::NUMERIC(15,2) as quantidade_total,
      COALESCE(pc.total_transacoes, 0)::NUMERIC as total_transacoes,
      COALESCE(pc.ticket_medio, 0)::NUMERIC(15,2) as ticket_medio,
      COALESCE(pc.margem_lucro, 0)::NUMERIC(10,2) as margem_lucro,
      COALESCE(pa.pa_valor_total, 0)::NUMERIC(15,2) as pa_valor_total,
      COALESCE(pa.pa_custo_total, 0)::NUMERIC(15,2) as pa_custo_total,
      COALESCE(pa.pa_total_lucro, 0)::NUMERIC(15,2) as pa_total_lucro,
      COALESCE(pa.pa_total_transacoes, 0)::NUMERIC as pa_total_transacoes,
      COALESCE(pa.pa_ticket_medio, 0)::NUMERIC(15,2) as pa_ticket_medio,
      COALESCE(pa.pa_margem_lucro, 0)::NUMERIC(10,2) as pa_margem_lucro,
      -- Deltas
      (COALESCE(pc.valor_total, 0) - COALESCE(pa.pa_valor_total, 0))::NUMERIC(15,2) as delta_valor,
      CASE
        WHEN COALESCE(pa.pa_valor_total, 0) > 0
        THEN LEAST(((COALESCE(pc.valor_total, 0) - COALESCE(pa.pa_valor_total, 0)) / pa.pa_valor_total * 100), 99999999.99)::NUMERIC(10,2)
        ELSE 0
      END as delta_valor_percent,
      (COALESCE(pc.custo_total, 0) - COALESCE(pa.pa_custo_total, 0))::NUMERIC(15,2) as delta_custo,
      CASE
        WHEN COALESCE(pa.pa_custo_total, 0) > 0
        THEN LEAST(((COALESCE(pc.custo_total, 0) - COALESCE(pa.pa_custo_total, 0)) / pa.pa_custo_total * 100), 99999999.99)::NUMERIC(10,2)
        ELSE 0
      END as delta_custo_percent,
      (COALESCE(pc.total_lucro, 0) - COALESCE(pa.pa_total_lucro, 0))::NUMERIC(15,2) as delta_lucro,
      CASE
        WHEN COALESCE(pa.pa_total_lucro, 0) > 0
        THEN LEAST(((COALESCE(pc.total_lucro, 0) - COALESCE(pa.pa_total_lucro, 0)) / pa.pa_total_lucro * 100), 99999999.99)::NUMERIC(10,2)
        ELSE 0
      END as delta_lucro_percent,
      (COALESCE(pc.margem_lucro, 0) - COALESCE(pa.pa_margem_lucro, 0))::NUMERIC(10,2) as delta_margem,
      -- Entradas
      COALESCE(epa.total_entradas, 0)::NUMERIC(15,2) as total_entradas,
      COALESCE(epan.pa_total_entradas, 0)::NUMERIC(15,2) as pa_total_entradas,
      (COALESCE(epa.total_entradas, 0) - COALESCE(epan.pa_total_entradas, 0))::NUMERIC(15,2) as delta_entradas,
      CASE
        WHEN COALESCE(epan.pa_total_entradas, 0) > 0
        THEN LEAST(((COALESCE(epa.total_entradas, 0) - COALESCE(epan.pa_total_entradas, 0)) / epan.pa_total_entradas * 100), 99999999.99)::NUMERIC(10,2)
        ELSE 0
      END as delta_entradas_percent,
      -- Cupons (SUM de qtde_cupons)
      COALESCE(cpa.total_cupons, 0)::BIGINT as total_cupons,
      COALESCE(cpan.pa_total_cupons, 0)::BIGINT as pa_total_cupons,
      (COALESCE(cpa.total_cupons, 0) - COALESCE(cpan.pa_total_cupons, 0))::BIGINT as delta_cupons,
      CASE
        WHEN COALESCE(cpan.pa_total_cupons, 0) > 0
        THEN LEAST(((COALESCE(cpa.total_cupons, 0) - COALESCE(cpan.pa_total_cupons, 0))::NUMERIC / cpan.pa_total_cupons * 100), 99999999.99)::NUMERIC(10,2)
        ELSE 0
      END as delta_cupons_percent,
      -- SKU (SUM de qtde_produtos)
      COALESCE(spa.total_sku, 0)::BIGINT as total_sku,
      COALESCE(span.pa_total_sku, 0)::BIGINT as pa_total_sku,
      (COALESCE(spa.total_sku, 0) - COALESCE(span.pa_total_sku, 0))::BIGINT as delta_sku,
      CASE
        WHEN COALESCE(span.pa_total_sku, 0) > 0
        THEN LEAST(((COALESCE(spa.total_sku, 0) - COALESCE(span.pa_total_sku, 0))::NUMERIC / span.pa_total_sku * 100), 99999999.99)::NUMERIC(10,2)
        ELSE 0
      END as delta_sku_percent
    FROM todas_filiais tf
    LEFT JOIN periodo_atual_com_desconto pc ON tf.filial_id = pc.filial_id
    LEFT JOIN periodo_anterior_com_desconto pa ON tf.filial_id = pa.filial_id
    LEFT JOIN entradas_periodo_atual epa ON tf.filial_id = epa.filial_id
    LEFT JOIN entradas_periodo_anterior epan ON tf.filial_id = epan.filial_id
    LEFT JOIN cupons_periodo_atual cpa ON tf.filial_id = cpa.filial_id
    LEFT JOIN cupons_periodo_anterior cpan ON tf.filial_id = cpan.filial_id
    LEFT JOIN sku_periodo_atual spa ON tf.filial_id = spa.filial_id
    LEFT JOIN sku_periodo_anterior span ON tf.filial_id = span.filial_id
    WHERE COALESCE(pc.valor_total, 0) > 0 
       OR COALESCE(epa.total_entradas, 0) > 0
       OR COALESCE(cpa.total_cupons, 0) > 0
       OR COALESCE(spa.total_sku, 0) > 0
    ORDER BY COALESCE(pc.valor_total, 0) DESC NULLS LAST
  ',
  p_schema, v_filiais_condition,
  p_schema, v_filiais_condition,
  p_schema, v_filiais_condition,
  p_schema, v_filiais_condition
  )
  USING p_data_inicio, p_data_fim, v_pa_data_inicio, v_pa_data_fim;
END;
$$;

-- Comentário da função
COMMENT ON FUNCTION public.get_vendas_por_filial IS 
  'Retorna vendas por filial com dados de PDV, entradas, cupons (resumo_vendas_caixa.qtde_cupons), SKU (resumo_vendas_caixa.qtde_produtos) e comparação com período anterior. Versão 2026-01-10 corrigida com fonte permanente.';
