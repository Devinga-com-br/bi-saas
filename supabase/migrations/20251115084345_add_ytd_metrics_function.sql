-- =====================================================
-- FUNCTION: get_dashboard_ytd_metrics
-- =====================================================
-- Purpose: Calculate Year-to-Date metrics for Profit and Margin
--          without modifying the existing get_dashboard_data function
--
-- Parameters:
--   schema_name: Schema name of the tenant
--   p_data_inicio: Start date of current period (e.g., '2025-01-01')
--   p_data_fim: End date of current period (e.g., '2025-11-15')
--   p_filiais_ids: Array of branch IDs (NULL = all branches)
--
-- Returns: Single row with YTD metrics:
--   - ytd_lucro: Profit YTD current year (WITH discounts subtracted)
--   - ytd_lucro_ano_anterior: Profit YTD previous year (WITH discounts subtracted)
--   - ytd_variacao_lucro_percent: % variation profit
--   - ytd_margem: Margin YTD current year
--   - ytd_margem_ano_anterior: Margin YTD previous year
--   - ytd_variacao_margem: Margin variation (percentage points)
--
-- Tables used:
--   - {schema}.vendas_diarias_por_filial (aggregated sales data)
--   - {schema}.descontos_venda (optional - if exists, discounts are subtracted)
--
-- Important notes:
--   - ALWAYS uses CURRENT_DATE to ensure fair YTD comparison
--   - Applies discounts from descontos_venda table if it exists
--   - Discounts are subtracted from BOTH revenue and profit
--   - Filters by filial_id when p_filiais_ids is provided
--
-- Example:
--   Today: 2025-11-15, Filter: Ano 2025
--   Calculates: 2025-01-01 to 2025-11-15 vs 2024-01-01 to 2024-11-15
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_ytd_metrics(
  schema_name TEXT,
  p_data_inicio DATE,
  p_data_fim DATE,
  p_filiais_ids TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  ytd_vendas NUMERIC,
  ytd_vendas_ano_anterior NUMERIC,
  ytd_variacao_vendas_percent NUMERIC,
  ytd_lucro NUMERIC,
  ytd_lucro_ano_anterior NUMERIC,
  ytd_variacao_lucro_percent NUMERIC,
  ytd_margem NUMERIC,
  ytd_margem_ano_anterior NUMERIC,
  ytd_variacao_margem NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_data_inicio_ytd DATE;
  v_data_fim_ytd DATE;
  v_data_inicio_ytd_ano_anterior DATE;
  v_data_fim_ytd_ano_anterior DATE;
  
  v_ytd_vendas NUMERIC := 0;
  v_ytd_lucro NUMERIC := 0;
  v_ytd_margem NUMERIC := 0;
  
  v_ytd_vendas_ano_anterior NUMERIC := 0;
  v_ytd_lucro_ano_anterior NUMERIC := 0;
  v_ytd_margem_ano_anterior NUMERIC := 0;
  
  v_ytd_variacao_lucro_percent NUMERIC := 0;
  v_ytd_variacao_margem NUMERIC := 0;
  v_ytd_variacao_vendas_percent NUMERIC := 0;
  
  v_descontos_ytd NUMERIC := 0;
  v_descontos_ytd_ano_anterior NUMERIC := 0;
  v_table_exists BOOLEAN;
BEGIN
  -- Calculate YTD dates (start of year to end date)
  -- IMPORTANT: Use CURRENT_DATE only if the filtered year is the current year
  -- This ensures YTD comparison is fair (same period in both years)
  v_data_inicio_ytd := DATE_TRUNC('year', p_data_inicio)::DATE;
  
  -- Use CURRENT_DATE only if filtering the current year
  -- Otherwise use the actual end date from the filter
  IF EXTRACT(YEAR FROM p_data_inicio) = EXTRACT(YEAR FROM CURRENT_DATE) THEN
    v_data_fim_ytd := LEAST(p_data_fim, CURRENT_DATE);
  ELSE
    -- For past years, use the actual end date (e.g., 31/12/2024)
    v_data_fim_ytd := p_data_fim;
  END IF;
  
  -- Calculate YTD dates for previous year (same period)
  v_data_inicio_ytd_ano_anterior := (v_data_inicio_ytd - INTERVAL '1 year')::DATE;
  v_data_fim_ytd_ano_anterior := (v_data_fim_ytd - INTERVAL '1 year')::DATE;
  
  -- Check if descontos_venda table exists
  EXECUTE format('
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = %L AND table_name = ''descontos_venda''
    )', schema_name) INTO v_table_exists;
  
  -- ==========================================
  -- CURRENT YEAR YTD (e.g., 2025-01-01 to 2025-11-15)
  -- ==========================================
  
  EXECUTE format('
    SELECT
      COALESCE(SUM(valor_total), 0) as vendas,
      COALESCE(SUM(total_lucro), 0) as lucro
    FROM %I.vendas_diarias_por_filial
    WHERE data_venda BETWEEN $1 AND $2
      AND ($3 IS NULL OR filial_id = ANY($3::INTEGER[]))
  ', schema_name)
  USING v_data_inicio_ytd, v_data_fim_ytd, p_filiais_ids
  INTO v_ytd_vendas, v_ytd_lucro;
  
  -- Get discounts for current year YTD if table exists
  IF v_table_exists THEN
    EXECUTE format('
      SELECT COALESCE(SUM(valor_desconto), 0)
      FROM %I.descontos_venda
      WHERE data_desconto BETWEEN $1 AND $2
        AND ($3 IS NULL OR filial_id = ANY($3::INTEGER[]))
    ', schema_name)
    USING v_data_inicio_ytd, v_data_fim_ytd, p_filiais_ids
    INTO v_descontos_ytd;
    
    v_ytd_vendas := v_ytd_vendas - v_descontos_ytd;
    v_ytd_lucro := v_ytd_lucro - v_descontos_ytd;
  END IF;
  
  -- Calculate current year YTD margin
  IF v_ytd_vendas > 0 THEN
    v_ytd_margem := (v_ytd_lucro / v_ytd_vendas) * 100;
  ELSE
    v_ytd_margem := 0;
  END IF;
  
  -- ==========================================
  -- PREVIOUS YEAR YTD (e.g., 2024-01-01 to 2024-11-15)
  -- ==========================================
  
  EXECUTE format('
    SELECT
      COALESCE(SUM(valor_total), 0) as vendas,
      COALESCE(SUM(total_lucro), 0) as lucro
    FROM %I.vendas_diarias_por_filial
    WHERE data_venda BETWEEN $1 AND $2
      AND ($3 IS NULL OR filial_id = ANY($3::INTEGER[]))
  ', schema_name)
  USING v_data_inicio_ytd_ano_anterior, v_data_fim_ytd_ano_anterior, p_filiais_ids
  INTO v_ytd_vendas_ano_anterior, v_ytd_lucro_ano_anterior;
  
  -- Get discounts for previous year YTD if table exists
  IF v_table_exists THEN
    EXECUTE format('
      SELECT COALESCE(SUM(valor_desconto), 0)
      FROM %I.descontos_venda
      WHERE data_desconto BETWEEN $1 AND $2
        AND ($3 IS NULL OR filial_id = ANY($3::INTEGER[]))
    ', schema_name)
    USING v_data_inicio_ytd_ano_anterior, v_data_fim_ytd_ano_anterior, p_filiais_ids
    INTO v_descontos_ytd_ano_anterior;
    
    v_ytd_vendas_ano_anterior := v_ytd_vendas_ano_anterior - v_descontos_ytd_ano_anterior;
    v_ytd_lucro_ano_anterior := v_ytd_lucro_ano_anterior - v_descontos_ytd_ano_anterior;
  END IF;
  
  -- Calculate previous year YTD margin
  IF v_ytd_vendas_ano_anterior > 0 THEN
    v_ytd_margem_ano_anterior := (v_ytd_lucro_ano_anterior / v_ytd_vendas_ano_anterior) * 100;
  ELSE
    v_ytd_margem_ano_anterior := 0;
  END IF;
  
  -- ==========================================
  -- CALCULATE VARIATIONS
  -- ==========================================
  
  -- Revenue variation %
  IF v_ytd_vendas_ano_anterior > 0 THEN
    v_ytd_variacao_vendas_percent := ((v_ytd_vendas - v_ytd_vendas_ano_anterior) / v_ytd_vendas_ano_anterior) * 100;
  ELSE
    v_ytd_variacao_vendas_percent := 0;
  END IF;
  
  -- Profit variation %
  IF v_ytd_lucro_ano_anterior > 0 THEN
    v_ytd_variacao_lucro_percent := ((v_ytd_lucro - v_ytd_lucro_ano_anterior) / v_ytd_lucro_ano_anterior) * 100;
  ELSE
    v_ytd_variacao_lucro_percent := 0;
  END IF;
  
  -- Margin variation (percentage points)
  v_ytd_variacao_margem := v_ytd_margem - v_ytd_margem_ano_anterior;
  
  -- ==========================================
  -- RETURN RESULTS
  -- ==========================================
  
  RETURN QUERY SELECT
    v_ytd_vendas,
    v_ytd_vendas_ano_anterior,
    v_ytd_variacao_vendas_percent,
    v_ytd_lucro,
    v_ytd_lucro_ano_anterior,
    v_ytd_variacao_lucro_percent,
    v_ytd_margem,
    v_ytd_margem_ano_anterior,
    v_ytd_variacao_margem;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_dashboard_ytd_metrics(TEXT, DATE, DATE, TEXT[]) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_dashboard_ytd_metrics IS 
'Calculates Year-to-Date metrics for Profit and Margin. Created to complement get_dashboard_data without modifying it.';
