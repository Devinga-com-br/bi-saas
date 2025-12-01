-- =====================================================
-- FIX: get_dashboard_mtd_metrics for past months
-- =====================================================
-- Problem: When filtering a past month (e.g., November 2025 on December 1st),
--          the function was using CURRENT_DATE's day (1) to calculate MTD,
--          resulting in comparing only day 1 of each month instead of full months.
--
-- Solution: Use the filter's end date (p_data_fim) as reference when the
--           selected month is in the past. Only use CURRENT_DATE when the
--           selected period includes the current date.
--
-- Example (Today is 2025-12-01):
--   Filter: November 2025 (2025-11-01 to 2025-11-30)
--   OLD behavior: Compared day 1 only (because CURRENT_DATE day = 1)
--   NEW behavior: Compares full month (because p_data_fim = 2025-11-30)
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_mtd_metrics(
  schema_name TEXT,
  p_data_inicio DATE,
  p_data_fim DATE,
  p_filiais_ids TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  mtd_vendas NUMERIC,
  mtd_lucro NUMERIC,
  mtd_margem NUMERIC,
  mtd_mes_anterior_vendas NUMERIC,
  mtd_mes_anterior_lucro NUMERIC,
  mtd_mes_anterior_margem NUMERIC,
  mtd_variacao_mes_anterior_vendas_percent NUMERIC,
  mtd_variacao_mes_anterior_lucro_percent NUMERIC,
  mtd_variacao_mes_anterior_margem NUMERIC,
  mtd_ano_anterior_vendas NUMERIC,
  mtd_ano_anterior_lucro NUMERIC,
  mtd_ano_anterior_margem NUMERIC,
  mtd_variacao_ano_anterior_vendas_percent NUMERIC,
  mtd_variacao_ano_anterior_lucro_percent NUMERIC,
  mtd_variacao_ano_anterior_margem NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  -- Reference day for MTD calculation
  v_reference_day INTEGER;
  v_mtd_end_day INTEGER;

  -- MTD date ranges
  v_data_inicio_mtd DATE;
  v_data_fim_mtd DATE;
  v_data_inicio_mtd_mes_anterior DATE;
  v_data_fim_mtd_mes_anterior DATE;
  v_data_inicio_mtd_ano_anterior DATE;
  v_data_fim_mtd_ano_anterior DATE;

  -- Current MTD metrics
  v_mtd_vendas NUMERIC := 0;
  v_mtd_lucro NUMERIC := 0;
  v_mtd_margem NUMERIC := 0;

  -- Previous month MTD metrics
  v_mtd_mes_anterior_vendas NUMERIC := 0;
  v_mtd_mes_anterior_lucro NUMERIC := 0;
  v_mtd_mes_anterior_margem NUMERIC := 0;

  -- Previous year MTD metrics
  v_mtd_ano_anterior_vendas NUMERIC := 0;
  v_mtd_ano_anterior_lucro NUMERIC := 0;
  v_mtd_ano_anterior_margem NUMERIC := 0;

  -- Variations
  v_mtd_variacao_mes_anterior_vendas_percent NUMERIC := 0;
  v_mtd_variacao_mes_anterior_lucro_percent NUMERIC := 0;
  v_mtd_variacao_mes_anterior_margem NUMERIC := 0;
  v_mtd_variacao_ano_anterior_vendas_percent NUMERIC := 0;
  v_mtd_variacao_ano_anterior_lucro_percent NUMERIC := 0;
  v_mtd_variacao_ano_anterior_margem NUMERIC := 0;

  -- Discounts
  v_descontos_mtd NUMERIC := 0;
  v_descontos_mtd_mes_anterior NUMERIC := 0;
  v_descontos_mtd_ano_anterior NUMERIC := 0;
  v_table_exists BOOLEAN;

  -- Helper for last day of month
  v_last_day_mes_anterior INTEGER;
  v_last_day_ano_anterior INTEGER;
BEGIN
  -- ==========================================
  -- DETERMINE REFERENCE DAY FOR MTD CALCULATION
  -- ==========================================
  -- If the filter end date is in the past, use the filter's end day
  -- If the filter includes current date, use today's day (true MTD)

  IF p_data_fim >= CURRENT_DATE THEN
    -- Current month or future: use today's day as reference
    v_reference_day := EXTRACT(DAY FROM CURRENT_DATE);
  ELSE
    -- Past month: use the filter's end date day (full month comparison)
    v_reference_day := EXTRACT(DAY FROM p_data_fim);
  END IF;

  -- ==========================================
  -- CALCULATE MTD DATE RANGES
  -- ==========================================

  -- Current MTD: start of month to reference day
  v_data_inicio_mtd := DATE_TRUNC('month', p_data_inicio)::DATE;
  v_data_fim_mtd := LEAST(
    (DATE_TRUNC('month', p_data_inicio) + (v_reference_day - 1) * INTERVAL '1 day')::DATE,
    p_data_fim  -- Don't exceed the filter end date
  );

  -- Previous month MTD: same day range in previous month
  v_data_inicio_mtd_mes_anterior := (DATE_TRUNC('month', p_data_inicio) - INTERVAL '1 month')::DATE;

  -- Calculate last day of previous month
  v_last_day_mes_anterior := EXTRACT(DAY FROM (DATE_TRUNC('month', p_data_inicio) - INTERVAL '1 day')::DATE);

  -- Use the minimum between reference day and last day of previous month
  v_mtd_end_day := LEAST(v_reference_day, v_last_day_mes_anterior);
  v_data_fim_mtd_mes_anterior := (v_data_inicio_mtd_mes_anterior + (v_mtd_end_day - 1) * INTERVAL '1 day')::DATE;

  -- Previous year MTD: same month and day range in previous year
  v_data_inicio_mtd_ano_anterior := (DATE_TRUNC('month', p_data_inicio) - INTERVAL '1 year')::DATE;

  -- Calculate last day of same month in previous year
  v_last_day_ano_anterior := EXTRACT(DAY FROM ((DATE_TRUNC('month', p_data_inicio) - INTERVAL '1 year') + INTERVAL '1 month' - INTERVAL '1 day')::DATE);

  -- Use the minimum between reference day and last day of same month previous year
  v_mtd_end_day := LEAST(v_reference_day, v_last_day_ano_anterior);
  v_data_fim_mtd_ano_anterior := (v_data_inicio_mtd_ano_anterior + (v_mtd_end_day - 1) * INTERVAL '1 day')::DATE;

  -- Check if descontos_venda table exists
  EXECUTE format('
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = %L AND table_name = ''descontos_venda''
    )', schema_name) INTO v_table_exists;

  -- ==========================================
  -- CURRENT MTD (e.g., 2025-11-01 to 2025-11-30 for past month)
  -- ==========================================

  EXECUTE format('
    SELECT
      COALESCE(SUM(valor_total), 0) as vendas,
      COALESCE(SUM(total_lucro), 0) as lucro
    FROM %I.vendas_diarias_por_filial
    WHERE data_venda BETWEEN $1 AND $2
      AND ($3 IS NULL OR filial_id = ANY($3::INTEGER[]))
  ', schema_name)
  USING v_data_inicio_mtd, v_data_fim_mtd, p_filiais_ids
  INTO v_mtd_vendas, v_mtd_lucro;

  -- Get discounts for current MTD if table exists
  IF v_table_exists THEN
    EXECUTE format('
      SELECT COALESCE(SUM(valor_desconto), 0)
      FROM %I.descontos_venda
      WHERE data_desconto BETWEEN $1 AND $2
        AND ($3 IS NULL OR filial_id = ANY($3::INTEGER[]))
    ', schema_name)
    USING v_data_inicio_mtd, v_data_fim_mtd, p_filiais_ids
    INTO v_descontos_mtd;

    v_mtd_vendas := v_mtd_vendas - v_descontos_mtd;
    v_mtd_lucro := v_mtd_lucro - v_descontos_mtd;
  END IF;

  -- Calculate current MTD margin
  IF v_mtd_vendas > 0 THEN
    v_mtd_margem := (v_mtd_lucro / v_mtd_vendas) * 100;
  ELSE
    v_mtd_margem := 0;
  END IF;

  -- ==========================================
  -- PREVIOUS MONTH MTD (e.g., 2025-10-01 to 2025-10-30)
  -- ==========================================

  EXECUTE format('
    SELECT
      COALESCE(SUM(valor_total), 0) as vendas,
      COALESCE(SUM(total_lucro), 0) as lucro
    FROM %I.vendas_diarias_por_filial
    WHERE data_venda BETWEEN $1 AND $2
      AND ($3 IS NULL OR filial_id = ANY($3::INTEGER[]))
  ', schema_name)
  USING v_data_inicio_mtd_mes_anterior, v_data_fim_mtd_mes_anterior, p_filiais_ids
  INTO v_mtd_mes_anterior_vendas, v_mtd_mes_anterior_lucro;

  -- Get discounts for previous month MTD if table exists
  IF v_table_exists THEN
    EXECUTE format('
      SELECT COALESCE(SUM(valor_desconto), 0)
      FROM %I.descontos_venda
      WHERE data_desconto BETWEEN $1 AND $2
        AND ($3 IS NULL OR filial_id = ANY($3::INTEGER[]))
    ', schema_name)
    USING v_data_inicio_mtd_mes_anterior, v_data_fim_mtd_mes_anterior, p_filiais_ids
    INTO v_descontos_mtd_mes_anterior;

    v_mtd_mes_anterior_vendas := v_mtd_mes_anterior_vendas - v_descontos_mtd_mes_anterior;
    v_mtd_mes_anterior_lucro := v_mtd_mes_anterior_lucro - v_descontos_mtd_mes_anterior;
  END IF;

  -- Calculate previous month MTD margin
  IF v_mtd_mes_anterior_vendas > 0 THEN
    v_mtd_mes_anterior_margem := (v_mtd_mes_anterior_lucro / v_mtd_mes_anterior_vendas) * 100;
  ELSE
    v_mtd_mes_anterior_margem := 0;
  END IF;

  -- ==========================================
  -- PREVIOUS YEAR MTD (e.g., 2024-11-01 to 2024-11-30)
  -- ==========================================

  EXECUTE format('
    SELECT
      COALESCE(SUM(valor_total), 0) as vendas,
      COALESCE(SUM(total_lucro), 0) as lucro
    FROM %I.vendas_diarias_por_filial
    WHERE data_venda BETWEEN $1 AND $2
      AND ($3 IS NULL OR filial_id = ANY($3::INTEGER[]))
  ', schema_name)
  USING v_data_inicio_mtd_ano_anterior, v_data_fim_mtd_ano_anterior, p_filiais_ids
  INTO v_mtd_ano_anterior_vendas, v_mtd_ano_anterior_lucro;

  -- Get discounts for previous year MTD if table exists
  IF v_table_exists THEN
    EXECUTE format('
      SELECT COALESCE(SUM(valor_desconto), 0)
      FROM %I.descontos_venda
      WHERE data_desconto BETWEEN $1 AND $2
        AND ($3 IS NULL OR filial_id = ANY($3::INTEGER[]))
    ', schema_name)
    USING v_data_inicio_mtd_ano_anterior, v_data_fim_mtd_ano_anterior, p_filiais_ids
    INTO v_descontos_mtd_ano_anterior;

    v_mtd_ano_anterior_vendas := v_mtd_ano_anterior_vendas - v_descontos_mtd_ano_anterior;
    v_mtd_ano_anterior_lucro := v_mtd_ano_anterior_lucro - v_descontos_mtd_ano_anterior;
  END IF;

  -- Calculate previous year MTD margin
  IF v_mtd_ano_anterior_vendas > 0 THEN
    v_mtd_ano_anterior_margem := (v_mtd_ano_anterior_lucro / v_mtd_ano_anterior_vendas) * 100;
  ELSE
    v_mtd_ano_anterior_margem := 0;
  END IF;

  -- ==========================================
  -- CALCULATE VARIATIONS
  -- ==========================================

  -- Variations vs previous month
  IF v_mtd_mes_anterior_vendas > 0 THEN
    v_mtd_variacao_mes_anterior_vendas_percent := ((v_mtd_vendas - v_mtd_mes_anterior_vendas) / v_mtd_mes_anterior_vendas) * 100;
  ELSE
    v_mtd_variacao_mes_anterior_vendas_percent := 0;
  END IF;

  IF v_mtd_mes_anterior_lucro > 0 THEN
    v_mtd_variacao_mes_anterior_lucro_percent := ((v_mtd_lucro - v_mtd_mes_anterior_lucro) / v_mtd_mes_anterior_lucro) * 100;
  ELSE
    v_mtd_variacao_mes_anterior_lucro_percent := 0;
  END IF;

  v_mtd_variacao_mes_anterior_margem := v_mtd_margem - v_mtd_mes_anterior_margem;

  -- Variations vs previous year
  IF v_mtd_ano_anterior_vendas > 0 THEN
    v_mtd_variacao_ano_anterior_vendas_percent := ((v_mtd_vendas - v_mtd_ano_anterior_vendas) / v_mtd_ano_anterior_vendas) * 100;
  ELSE
    v_mtd_variacao_ano_anterior_vendas_percent := 0;
  END IF;

  IF v_mtd_ano_anterior_lucro > 0 THEN
    v_mtd_variacao_ano_anterior_lucro_percent := ((v_mtd_lucro - v_mtd_ano_anterior_lucro) / v_mtd_ano_anterior_lucro) * 100;
  ELSE
    v_mtd_variacao_ano_anterior_lucro_percent := 0;
  END IF;

  v_mtd_variacao_ano_anterior_margem := v_mtd_margem - v_mtd_ano_anterior_margem;

  -- ==========================================
  -- RETURN RESULTS
  -- ==========================================

  RETURN QUERY SELECT
    v_mtd_vendas,
    v_mtd_lucro,
    v_mtd_margem,
    v_mtd_mes_anterior_vendas,
    v_mtd_mes_anterior_lucro,
    v_mtd_mes_anterior_margem,
    v_mtd_variacao_mes_anterior_vendas_percent,
    v_mtd_variacao_mes_anterior_lucro_percent,
    v_mtd_variacao_mes_anterior_margem,
    v_mtd_ano_anterior_vendas,
    v_mtd_ano_anterior_lucro,
    v_mtd_ano_anterior_margem,
    v_mtd_variacao_ano_anterior_vendas_percent,
    v_mtd_variacao_ano_anterior_lucro_percent,
    v_mtd_variacao_ano_anterior_margem;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_dashboard_mtd_metrics(TEXT, DATE, DATE, TEXT[]) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_dashboard_mtd_metrics IS
'Calculates Month-to-Date metrics for Revenue, Profit and Margin. When filtering a past month, compares full months. When filtering current month, compares up to today (true MTD).';
