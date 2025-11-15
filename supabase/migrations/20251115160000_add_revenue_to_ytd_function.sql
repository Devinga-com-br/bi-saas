-- =====================================================
-- FUNCTION UPDATE: get_dashboard_ytd_metrics
-- =====================================================
-- Purpose: Add revenue (vendas) YTD to the function return
-- 
-- Changes:
--   - Added ytd_vendas to return values
--   - Added ytd_vendas_ano_anterior to return values
--   - Added ytd_variacao_vendas_percent to return values
-- =====================================================

DROP FUNCTION IF EXISTS public.get_dashboard_ytd_metrics(TEXT, DATE, DATE, TEXT[]);

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
  
  v_ytd_variacao_vendas_percent NUMERIC := 0;
  v_ytd_variacao_lucro_percent NUMERIC := 0;
  v_ytd_variacao_margem NUMERIC := 0;
  
  v_descontos_ytd NUMERIC := 0;
  v_descontos_ytd_ano_anterior NUMERIC := 0;
  v_table_exists BOOLEAN;
BEGIN
  -- Calculate YTD dates (start of year to end date)
  v_data_inicio_ytd := DATE_TRUNC('year', p_data_inicio)::DATE;
  
  -- Use CURRENT_DATE only if filtering the current year
  IF EXTRACT(YEAR FROM p_data_inicio) = EXTRACT(YEAR FROM CURRENT_DATE) THEN
    v_data_fim_ytd := LEAST(p_data_fim, CURRENT_DATE);
  ELSE
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
  -- CURRENT YEAR YTD
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
  -- PREVIOUS YEAR YTD
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_dashboard_ytd_metrics(TEXT, DATE, DATE, TEXT[]) TO authenticated;

-- Update comment
COMMENT ON FUNCTION public.get_dashboard_ytd_metrics IS 
'Calculates Year-to-Date metrics for Revenue, Profit and Margin with discounts applied.';
