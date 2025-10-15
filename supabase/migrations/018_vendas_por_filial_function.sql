-- Migration: Create function to get sales by branch with comparison
-- Description: Returns sales data by branch for a period with year-over-year comparison

CREATE OR REPLACE FUNCTION get_vendas_por_filial(
  p_schema TEXT,
  p_data_inicio DATE,
  p_data_fim DATE,
  p_filiais TEXT DEFAULT 'all'
)
RETURNS TABLE (
  filial_id BIGINT,
  valor_total NUMERIC,
  custo_total NUMERIC,
  total_lucro NUMERIC,
  quantidade_total NUMERIC,
  total_transacoes NUMERIC,
  ticket_medio NUMERIC,
  margem_lucro NUMERIC,
  pa_valor_total NUMERIC,
  pa_custo_total NUMERIC,
  pa_total_lucro NUMERIC,
  pa_total_transacoes NUMERIC,
  pa_ticket_medio NUMERIC,
  pa_margem_lucro NUMERIC,
  delta_valor NUMERIC,
  delta_valor_percent NUMERIC,
  delta_custo NUMERIC,
  delta_custo_percent NUMERIC,
  delta_lucro NUMERIC,
  delta_lucro_percent NUMERIC,
  delta_margem NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pa_data_inicio DATE;
  v_pa_data_fim DATE;
  v_filiais_condition TEXT;
BEGIN
  -- Calcular período anterior (ano anterior)
  v_pa_data_inicio := p_data_inicio - INTERVAL '1 year';
  v_pa_data_fim := p_data_fim - INTERVAL '1 year';
  
  -- Condição de filiais
  IF p_filiais = 'all' OR p_filiais IS NULL THEN
    v_filiais_condition := '';
  ELSE
    v_filiais_condition := format(' AND v.filial_id IN (%s)', p_filiais);
  END IF;
  
  -- Query principal com CTE para período atual e anterior
  RETURN QUERY EXECUTE format('
    WITH periodo_atual AS (
      SELECT 
        v.filial_id,
        SUM(v.valor_total) as valor_total,
        SUM(v.custo_total) as custo_total,
        SUM(v.total_lucro) as total_lucro,
        SUM(v.quantidade_total) as quantidade_total,
        SUM(v.total_transacoes) as total_transacoes,
        CASE 
          WHEN SUM(v.total_transacoes) > 0 
          THEN SUM(v.valor_total)::NUMERIC / SUM(v.total_transacoes)::NUMERIC
          ELSE 0 
        END as ticket_medio,
        CASE 
          WHEN SUM(v.valor_total) > 0 
          THEN (SUM(v.total_lucro)::NUMERIC / SUM(v.valor_total)::NUMERIC) * 100
          ELSE 0 
        END as margem_lucro
      FROM %I.vendas_diarias_por_filial v
      WHERE v.data_venda BETWEEN $1 AND $2
      %s
      GROUP BY v.filial_id
    ),
    periodo_anterior AS (
      SELECT 
        v.filial_id,
        SUM(v.valor_total) as pa_valor_total,
        SUM(v.custo_total) as pa_custo_total,
        SUM(v.total_lucro) as pa_total_lucro,
        SUM(v.total_transacoes) as pa_total_transacoes,
        CASE 
          WHEN SUM(v.total_transacoes) > 0 
          THEN SUM(v.valor_total)::NUMERIC / SUM(v.total_transacoes)::NUMERIC
          ELSE 0 
        END as pa_ticket_medio,
        CASE 
          WHEN SUM(v.valor_total) > 0 
          THEN (SUM(v.total_lucro)::NUMERIC / SUM(v.valor_total)::NUMERIC) * 100
          ELSE 0 
        END as pa_margem_lucro
      FROM %I.vendas_diarias_por_filial v
      WHERE v.data_venda BETWEEN $3 AND $4
      %s
      GROUP BY v.filial_id
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
    FROM periodo_atual pa
    LEFT JOIN periodo_anterior pp ON pa.filial_id = pp.filial_id
    ORDER BY pa.filial_id
  ',
  p_schema,
  v_filiais_condition,
  p_schema,
  v_filiais_condition)
  USING p_data_inicio, p_data_fim, v_pa_data_inicio, v_pa_data_fim;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_vendas_por_filial(TEXT, DATE, DATE, TEXT) TO authenticated;
