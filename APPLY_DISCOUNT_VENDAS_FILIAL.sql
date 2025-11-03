-- ================================================================
-- APLICAR DESCONTOS NA TABELA DE VENDAS POR FILIAL
-- ================================================================
-- Execute este script no Supabase SQL Editor
-- ================================================================

CREATE OR REPLACE FUNCTION public.get_vendas_por_filial(
  p_schema text,
  p_data_inicio date,
  p_data_fim date,
  p_filiais text DEFAULT 'all'::text
)
RETURNS TABLE(
  filial_id bigint,
  valor_total numeric,
  custo_total numeric,
  total_lucro numeric,
  quantidade_total numeric,
  total_transacoes numeric,
  ticket_medio numeric,
  margem_lucro numeric,
  pa_valor_total numeric,
  pa_custo_total numeric,
  pa_total_lucro numeric,
  pa_total_transacoes numeric,
  pa_ticket_medio numeric,
  pa_margem_lucro numeric,
  delta_valor numeric,
  delta_valor_percent numeric,
  delta_custo numeric,
  delta_custo_percent numeric,
  delta_lucro numeric,
  delta_lucro_percent numeric,
  delta_margem numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_pa_data_inicio DATE;
  v_pa_data_fim DATE;
  v_filiais_condition TEXT;
BEGIN
  -- Calcular período anterior (ano anterior)
  v_pa_data_inicio := p_data_inicio - INTERVAL '1 year';
  v_pa_data_fim := p_data_fim - INTERVAL '1 year';

  -- Condição de filiais (sem alias, será usado em diferentes contextos)
  IF p_filiais = 'all' OR p_filiais IS NULL THEN
    v_filiais_condition := '';
  ELSE
    v_filiais_condition := format(' AND filial_id IN (%s)', p_filiais);
  END IF;

  -- Query principal com CTE para período atual e anterior
  RETURN QUERY EXECUTE format('
    WITH periodo_atual AS (
      SELECT
        filial_id,
        SUM(valor_total) as valor_total_bruto,
        SUM(custo_total) as custo_total,
        SUM(total_lucro) as total_lucro_bruto,
        SUM(quantidade_total) as quantidade_total,
        SUM(total_transacoes)::NUMERIC as total_transacoes
      FROM %I.vendas_diarias_por_filial
      WHERE data_venda BETWEEN $1 AND $2
      %s
      GROUP BY filial_id
    ),
    descontos_periodo_atual AS (
      SELECT
        filial_id,
        SUM(valor_desconto) as total_descontos
      FROM %I.descontos_venda
      WHERE data_desconto BETWEEN $1 AND $2
      %s
      GROUP BY filial_id
    ),
    periodo_atual_com_desconto AS (
      SELECT
        pa.filial_id,
        pa.valor_total_bruto - COALESCE(dpa.total_descontos, 0) as valor_total,
        pa.custo_total,
        pa.total_lucro_bruto - COALESCE(dpa.total_descontos, 0) as total_lucro,
        pa.quantidade_total,
        pa.total_transacoes,
        CASE
          WHEN pa.total_transacoes > 0
          THEN (pa.valor_total_bruto - COALESCE(dpa.total_descontos, 0))::NUMERIC / pa.total_transacoes::NUMERIC
          ELSE 0
        END as ticket_medio,
        CASE
          WHEN (pa.valor_total_bruto - COALESCE(dpa.total_descontos, 0)) > 0
          THEN ((pa.total_lucro_bruto - COALESCE(dpa.total_descontos, 0))::NUMERIC / (pa.valor_total_bruto - COALESCE(dpa.total_descontos, 0))::NUMERIC) * 100
          ELSE 0
        END as margem_lucro
      FROM periodo_atual pa
      LEFT JOIN descontos_periodo_atual dpa ON pa.filial_id = dpa.filial_id
    ),
    periodo_anterior AS (
      SELECT
        filial_id,
        SUM(valor_total) as pa_valor_total_bruto,
        SUM(custo_total) as pa_custo_total,
        SUM(total_lucro) as pa_total_lucro_bruto,
        SUM(total_transacoes)::NUMERIC as pa_total_transacoes
      FROM %I.vendas_diarias_por_filial
      WHERE data_venda BETWEEN $3 AND $4
      %s
      GROUP BY filial_id
    ),
    descontos_periodo_anterior AS (
      SELECT
        filial_id,
        SUM(valor_desconto) as total_descontos
      FROM %I.descontos_venda
      WHERE data_desconto BETWEEN $3 AND $4
      %s
      GROUP BY filial_id
    ),
    periodo_anterior_com_desconto AS (
      SELECT
        pp.filial_id,
        pp.pa_valor_total_bruto - COALESCE(dpp.total_descontos, 0) as pa_valor_total,
        pp.pa_custo_total,
        pp.pa_total_lucro_bruto - COALESCE(dpp.total_descontos, 0) as pa_total_lucro,
        pp.pa_total_transacoes,
        CASE
          WHEN pp.pa_total_transacoes > 0
          THEN (pp.pa_valor_total_bruto - COALESCE(dpp.total_descontos, 0))::NUMERIC / pp.pa_total_transacoes::NUMERIC
          ELSE 0
        END as pa_ticket_medio,
        CASE
          WHEN (pp.pa_valor_total_bruto - COALESCE(dpp.total_descontos, 0)) > 0
          THEN ((pp.pa_total_lucro_bruto - COALESCE(dpp.total_descontos, 0))::NUMERIC / (pp.pa_valor_total_bruto - COALESCE(dpp.total_descontos, 0))::NUMERIC) * 100
          ELSE 0
        END as pa_margem_lucro
      FROM periodo_anterior pp
      LEFT JOIN descontos_periodo_anterior dpp ON pp.filial_id = dpp.filial_id
    )
    SELECT
      pa.filial_id,
      COALESCE(pa.valor_total, 0) as valor_total,
      COALESCE(pa.custo_total, 0) as custo_total,
      COALESCE(pa.total_lucro, 0) as total_lucro,
      COALESCE(pa.quantidade_total, 0) as quantidade_total,
      COALESCE(pa.total_transacoes, 0) as total_transacoes,
      COALESCE(pa.ticket_medio, 0) as ticket_medio,
      COALESCE(pa.margem_lucro, 0) as margem_lucro,
      COALESCE(pp.pa_valor_total, 0) as pa_valor_total,
      COALESCE(pp.pa_custo_total, 0) as pa_custo_total,
      COALESCE(pp.pa_total_lucro, 0) as pa_total_lucro,
      COALESCE(pp.pa_total_transacoes, 0) as pa_total_transacoes,
      COALESCE(pp.pa_ticket_medio, 0) as pa_ticket_medio,
      COALESCE(pp.pa_margem_lucro, 0) as pa_margem_lucro,
      -- Deltas
      COALESCE(pa.valor_total, 0) - COALESCE(pp.pa_valor_total, 0) as delta_valor,
      CASE
        WHEN COALESCE(pp.pa_valor_total, 0) > 0
        THEN ((COALESCE(pa.valor_total, 0) - COALESCE(pp.pa_valor_total, 0))::NUMERIC / pp.pa_valor_total::NUMERIC) * 100
        ELSE 0
      END as delta_valor_percent,
      COALESCE(pa.custo_total, 0) - COALESCE(pp.pa_custo_total, 0) as delta_custo,
      CASE
        WHEN COALESCE(pp.pa_custo_total, 0) > 0
        THEN ((COALESCE(pa.custo_total, 0) - COALESCE(pp.pa_custo_total, 0))::NUMERIC / pp.pa_custo_total::NUMERIC) * 100
        ELSE 0
      END as delta_custo_percent,
      COALESCE(pa.total_lucro, 0) - COALESCE(pp.pa_total_lucro, 0) as delta_lucro,
      CASE
        WHEN COALESCE(pp.pa_total_lucro, 0) > 0
        THEN ((COALESCE(pa.total_lucro, 0) - COALESCE(pp.pa_total_lucro, 0))::NUMERIC / pp.pa_total_lucro::NUMERIC) * 100
        ELSE 0
      END as delta_lucro_percent,
      COALESCE(pa.margem_lucro, 0) - COALESCE(pp.pa_margem_lucro, 0) as delta_margem
    FROM periodo_atual_com_desconto pa
    LEFT JOIN periodo_anterior_com_desconto pp ON pa.filial_id = pp.filial_id
    ORDER BY pa.filial_id
  ',
  p_schema,
  v_filiais_condition,
  p_schema,
  v_filiais_condition,
  p_schema,
  v_filiais_condition,
  p_schema,
  v_filiais_condition)
  USING p_data_inicio, p_data_fim, v_pa_data_inicio, v_pa_data_fim;
END;
$function$;

COMMENT ON FUNCTION public.get_vendas_por_filial(text, date, date, text) IS
'Retorna vendas por filial com descontos aplicados da tabela descontos_venda';

-- Notificar PostgREST
NOTIFY pgrst, 'reload schema';

-- Teste manual (exemplo com schema saoluiz)
-- SELECT * FROM get_vendas_por_filial('saoluiz', '2025-11-01'::DATE, '2025-11-30'::DATE, 'all');
