-- =====================================================
-- Migration: Fix numeric overflow in get_vendas_por_filial
-- Created: 2025-11-30
-- Description: Aumenta a precisão dos campos percentuais de NUMERIC(5,2)
--              para NUMERIC(10,2) para evitar overflow quando variações
--              excedem 999.99% (ex: crescimento de 0 para valor positivo)
-- =====================================================

-- Drop função existente
DROP FUNCTION IF EXISTS public.get_vendas_por_filial(TEXT, DATE, DATE, TEXT, TEXT);

-- Criar nova versão com tipos numéricos corrigidos
CREATE OR REPLACE FUNCTION public.get_vendas_por_filial(
  p_schema TEXT,
  p_data_inicio DATE,
  p_data_fim DATE,
  p_filiais TEXT DEFAULT 'all',
  p_filter_type TEXT DEFAULT 'year'  -- 'month', 'year', 'custom'
)
RETURNS TABLE (
  filial_id BIGINT,
  valor_total NUMERIC(15,2),
  custo_total NUMERIC(15,2),
  total_lucro NUMERIC(15,2),
  quantidade_total NUMERIC(15,2),
  total_transacoes NUMERIC,
  ticket_medio NUMERIC(15,2),
  margem_lucro NUMERIC(10,2),          -- ALTERADO: de 5,2 para 10,2
  pa_valor_total NUMERIC(15,2),
  pa_custo_total NUMERIC(15,2),
  pa_total_lucro NUMERIC(15,2),
  pa_total_transacoes NUMERIC,
  pa_ticket_medio NUMERIC(15,2),
  pa_margem_lucro NUMERIC(10,2),       -- ALTERADO: de 5,2 para 10,2
  delta_valor NUMERIC(15,2),
  delta_valor_percent NUMERIC(10,2),   -- ALTERADO: de 5,2 para 10,2
  delta_custo NUMERIC(15,2),
  delta_custo_percent NUMERIC(10,2),   -- ALTERADO: de 5,2 para 10,2
  delta_lucro NUMERIC(15,2),
  delta_lucro_percent NUMERIC(10,2),   -- ALTERADO: de 5,2 para 10,2
  delta_margem NUMERIC(10,2)           -- ALTERADO: de 5,2 para 10,2
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
    -- Filtro por mês: comparar com mesmo mês do ano anterior
    v_pa_data_inicio := p_data_inicio - INTERVAL '1 year';
    v_pa_data_fim := p_data_fim - INTERVAL '1 year';
  ELSIF p_filter_type = 'year' THEN
    -- Filtro por ano: comparar com mesmo período do ano anterior
    v_pa_data_inicio := p_data_inicio - INTERVAL '1 year';
    v_pa_data_fim := p_data_fim - INTERVAL '1 year';
  ELSE
    -- Filtro customizado: comparar com período equivalente anterior
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
    -- Período Atual com desconto
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
    -- Período Anterior com desconto
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
    )
    SELECT
      COALESCE(pc.filial_id, pa.filial_id) as filial_id,
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
      (COALESCE(pc.margem_lucro, 0) - COALESCE(pa.pa_margem_lucro, 0))::NUMERIC(10,2) as delta_margem
    FROM periodo_atual_com_desconto pc
    FULL OUTER JOIN periodo_anterior_com_desconto pa ON pc.filial_id = pa.filial_id
    ORDER BY valor_total DESC NULLS LAST
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
COMMENT ON FUNCTION public.get_vendas_por_filial(TEXT, DATE, DATE, TEXT, TEXT) IS
'Retorna dados de vendas por filial com comparativo de período anterior.
Corrigido em 2025-11-30: campos percentuais alterados de NUMERIC(5,2) para NUMERIC(10,2)
para evitar overflow em variações maiores que 999.99%.
Parâmetros:
  - p_schema: Nome do schema do tenant
  - p_data_inicio: Data inicial do período
  - p_data_fim: Data final do período
  - p_filiais: Lista de filiais ou "all" para todas
  - p_filter_type: Tipo de filtro (month, year, custom)';

-- Permissões
GRANT EXECUTE ON FUNCTION public.get_vendas_por_filial(TEXT, DATE, DATE, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_vendas_por_filial(TEXT, DATE, DATE, TEXT, TEXT) TO service_role;
