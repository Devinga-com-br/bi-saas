-- =====================================================
-- Migration: Fix Month Comparison in Dashboard
-- Created: 2025-11-15 15:50
-- Description: Fix the PAM calculation to properly compare with
--              the full previous month when filtering by month
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_data(
  schema_name TEXT,
  p_data_inicio DATE,
  p_data_fim DATE,
  p_filiais_ids TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  total_vendas NUMERIC,
  total_lucro NUMERIC,
  ticket_medio NUMERIC,
  margem_lucro NUMERIC,
  pa_vendas NUMERIC,
  pa_lucro NUMERIC,
  pa_ticket_medio NUMERIC,
  pa_margem_lucro NUMERIC,
  variacao_vendas_mes NUMERIC,
  variacao_lucro_mes NUMERIC,
  variacao_ticket_mes NUMERIC,
  variacao_margem_mes NUMERIC,
  variacao_vendas_ano NUMERIC,
  variacao_lucro_ano NUMERIC,
  variacao_ticket_ano NUMERIC,
  variacao_margem_ano NUMERIC,
  ytd_vendas NUMERIC,
  ytd_vendas_ano_anterior NUMERIC,
  ytd_variacao_percent NUMERIC,
  grafico_vendas JSON,
  reserved TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_vendas NUMERIC := 0;
  v_total_lucro NUMERIC := 0;
  v_total_transacoes NUMERIC := 0;
  v_ticket_medio NUMERIC := 0;
  v_margem_lucro NUMERIC := 0;

  v_pa_vendas NUMERIC := 0;
  v_pa_lucro NUMERIC := 0;
  v_pa_transacoes NUMERIC := 0;
  v_pa_ticket_medio NUMERIC := 0;
  v_pa_margem_lucro NUMERIC := 0;

  v_paa_vendas NUMERIC := 0;
  v_paa_lucro NUMERIC := 0;
  v_paa_transacoes NUMERIC := 0;
  v_paa_ticket_medio NUMERIC := 0;
  v_paa_margem_lucro NUMERIC := 0;

  v_ytd_vendas NUMERIC := 0;
  v_ytd_vendas_ano_anterior NUMERIC := 0;
  v_ytd_variacao_percent NUMERIC := 0;

  v_variacao_vendas_mes NUMERIC := 0;
  v_variacao_lucro_mes NUMERIC := 0;
  v_variacao_ticket_mes NUMERIC := 0;
  v_variacao_margem_mes NUMERIC := 0;

  v_variacao_vendas_ano NUMERIC := 0;
  v_variacao_lucro_ano NUMERIC := 0;
  v_variacao_ticket_ano NUMERIC := 0;
  v_variacao_margem_ano NUMERIC := 0;

  v_grafico_vendas JSON := '[]'::JSON;

  v_data_inicio_pa DATE;
  v_data_fim_pa DATE;
  v_data_inicio_paa DATE;
  v_data_fim_paa DATE;
  v_data_inicio_ytd DATE;
  v_data_fim_ytd DATE;
  v_data_inicio_ytd_ano_anterior DATE;
  v_data_fim_ytd_ano_anterior DATE;

  v_descontos_periodo NUMERIC := 0;
  v_descontos_pa NUMERIC := 0;
  v_descontos_paa NUMERIC := 0;
  v_descontos_ytd NUMERIC := 0;
  v_descontos_ytd_ano_anterior NUMERIC := 0;

  v_table_exists BOOLEAN;
  v_is_full_year BOOLEAN := FALSE;
  v_is_full_month BOOLEAN := FALSE;
  
  -- Variables to hold the final comparison values
  v_final_pa_vendas NUMERIC := 0;
  v_final_pa_lucro NUMERIC := 0;
  v_final_pa_ticket_medio NUMERIC := 0;
  v_final_pa_margem_lucro NUMERIC := 0;
BEGIN
  -- ============================================
  -- Detect if the period is a full year
  -- ============================================
  IF EXTRACT(MONTH FROM p_data_inicio) = 1 
     AND EXTRACT(DAY FROM p_data_inicio) = 1
     AND EXTRACT(MONTH FROM p_data_fim) = 12
     AND EXTRACT(DAY FROM p_data_fim) = 31
     AND EXTRACT(YEAR FROM p_data_inicio) = EXTRACT(YEAR FROM p_data_fim) THEN
    v_is_full_year := TRUE;
  END IF;

  -- ============================================
  -- Detect if the period is a full month
  -- ============================================
  IF EXTRACT(DAY FROM p_data_inicio) = 1 
     AND p_data_fim = (DATE_TRUNC('month', p_data_inicio) + INTERVAL '1 month - 1 day')::DATE
     AND EXTRACT(MONTH FROM p_data_inicio) = EXTRACT(MONTH FROM p_data_fim)
     AND EXTRACT(YEAR FROM p_data_inicio) = EXTRACT(YEAR FROM p_data_fim) THEN
    v_is_full_month := TRUE;
  END IF;

  -- ============================================
  -- Calculate PAM (Período Anterior Mesmo) dates
  -- ============================================
  IF v_is_full_month THEN
    -- For full month: compare with the complete previous month
    -- Get the first day of previous month
    v_data_inicio_pa := (DATE_TRUNC('month', p_data_inicio) - INTERVAL '1 month')::DATE;
    -- Get the last day of previous month
    v_data_fim_pa := (DATE_TRUNC('month', p_data_inicio) - INTERVAL '1 day')::DATE;
  ELSE
    -- For other periods: subtract the same duration
    v_data_inicio_pa := (p_data_inicio - INTERVAL '1 month')::DATE;
    v_data_fim_pa := (p_data_fim - INTERVAL '1 month')::DATE;
  END IF;

  -- Calculate PAA dates
  IF v_is_full_year THEN
    -- For full year: compare with complete previous year (01/Jan to 31/Dec)
    v_data_inicio_paa := DATE_TRUNC('year', p_data_inicio - INTERVAL '1 year')::DATE;
    v_data_fim_paa := (DATE_TRUNC('year', p_data_inicio - INTERVAL '1 year') + INTERVAL '1 year - 1 day')::DATE;
  ELSE
    -- For other periods: same period, one year ago
    v_data_inicio_paa := (p_data_inicio - INTERVAL '1 year')::DATE;
    v_data_fim_paa := (p_data_fim - INTERVAL '1 year')::DATE;
  END IF;

  -- Calculate YTD dates
  v_data_inicio_ytd := DATE_TRUNC('year', p_data_inicio)::DATE;
  v_data_fim_ytd := p_data_fim;
  v_data_inicio_ytd_ano_anterior := (v_data_inicio_ytd - INTERVAL '1 year')::DATE;
  v_data_fim_ytd_ano_anterior := (v_data_fim_ytd - INTERVAL '1 year')::DATE;

  -- Check if descontos_venda table exists
  EXECUTE format('
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = %L AND table_name = ''descontos_venda''
    )', schema_name) INTO v_table_exists;

  -- ==========================================
  -- GET CURRENT PERIOD DATA
  -- ==========================================
  EXECUTE format('
    SELECT
      COALESCE(SUM(valor_total), 0),
      COALESCE(SUM(total_lucro), 0),
      COALESCE(SUM(total_transacoes), 0)
    FROM %I.vendas_diarias_por_filial
    WHERE data_venda BETWEEN $1 AND $2
      AND ($3 IS NULL OR filial_id = ANY($3::INTEGER[]))
  ', schema_name)
  USING p_data_inicio, p_data_fim, p_filiais_ids
  INTO v_total_vendas, v_total_lucro, v_total_transacoes;

  -- Get discounts for current period if table exists
  IF v_table_exists THEN
    EXECUTE format('
      SELECT COALESCE(SUM(valor_desconto), 0)
      FROM %I.descontos_venda
      WHERE data_desconto BETWEEN $1 AND $2
        AND ($3 IS NULL OR filial_id = ANY($3::INTEGER[]))
    ', schema_name)
    USING p_data_inicio, p_data_fim, p_filiais_ids
    INTO v_descontos_periodo;

    v_total_vendas := v_total_vendas - v_descontos_periodo;
    v_total_lucro := v_total_lucro - v_descontos_periodo;
  END IF;

  -- Calculate current period metrics
  IF v_total_transacoes > 0 THEN
    v_ticket_medio := v_total_vendas / v_total_transacoes;
  END IF;

  IF v_total_vendas > 0 THEN
    v_margem_lucro := (v_total_lucro / v_total_vendas) * 100;
  END IF;

  -- ==========================================
  -- GET PAM DATA (Previous Month)
  -- ==========================================
  EXECUTE format('
    SELECT
      COALESCE(SUM(valor_total), 0),
      COALESCE(SUM(total_lucro), 0),
      COALESCE(SUM(total_transacoes), 0)
    FROM %I.vendas_diarias_por_filial
    WHERE data_venda BETWEEN $1 AND $2
      AND ($3 IS NULL OR filial_id = ANY($3::INTEGER[]))
  ', schema_name)
  USING v_data_inicio_pa, v_data_fim_pa, p_filiais_ids
  INTO v_pa_vendas, v_pa_lucro, v_pa_transacoes;

  -- Get discounts for PAM if table exists
  IF v_table_exists THEN
    EXECUTE format('
      SELECT COALESCE(SUM(valor_desconto), 0)
      FROM %I.descontos_venda
      WHERE data_desconto BETWEEN $1 AND $2
        AND ($3 IS NULL OR filial_id = ANY($3::INTEGER[]))
    ', schema_name)
    USING v_data_inicio_pa, v_data_fim_pa, p_filiais_ids
    INTO v_descontos_pa;

    v_pa_vendas := v_pa_vendas - v_descontos_pa;
    v_pa_lucro := v_pa_lucro - v_descontos_pa;
  END IF;

  -- Calculate PAM metrics
  IF v_pa_transacoes > 0 THEN
    v_pa_ticket_medio := v_pa_vendas / v_pa_transacoes;
  END IF;

  IF v_pa_vendas > 0 THEN
    v_pa_margem_lucro := (v_pa_lucro / v_pa_vendas) * 100;
  END IF;

  -- ==========================================
  -- GET PAA DATA (Previous Year)
  -- ==========================================
  EXECUTE format('
    SELECT
      COALESCE(SUM(valor_total), 0),
      COALESCE(SUM(total_lucro), 0),
      COALESCE(SUM(total_transacoes), 0)
    FROM %I.vendas_diarias_por_filial
    WHERE data_venda BETWEEN $1 AND $2
      AND ($3 IS NULL OR filial_id = ANY($3::INTEGER[]))
  ', schema_name)
  USING v_data_inicio_paa, v_data_fim_paa, p_filiais_ids
  INTO v_paa_vendas, v_paa_lucro, v_paa_transacoes;

  -- Get discounts for PAA if table exists
  IF v_table_exists THEN
    EXECUTE format('
      SELECT COALESCE(SUM(valor_desconto), 0)
      FROM %I.descontos_venda
      WHERE data_desconto BETWEEN $1 AND $2
        AND ($3 IS NULL OR filial_id = ANY($3::INTEGER[]))
    ', schema_name)
    USING v_data_inicio_paa, v_data_fim_paa, p_filiais_ids
    INTO v_descontos_paa;

    v_paa_vendas := v_paa_vendas - v_descontos_paa;
    v_paa_lucro := v_paa_lucro - v_descontos_paa;
  END IF;

  -- Calculate PAA metrics
  IF v_paa_transacoes > 0 THEN
    v_paa_ticket_medio := v_paa_vendas / v_paa_transacoes;
  END IF;

  IF v_paa_vendas > 0 THEN
    v_paa_margem_lucro := (v_paa_lucro / v_paa_vendas) * 100;
  END IF;

  -- ==========================================
  -- DECIDE WHICH COMPARISON TO RETURN
  -- ==========================================
  IF v_is_full_year THEN
    -- For full year: return PAA (full previous year) in pa_* fields
    v_final_pa_vendas := v_paa_vendas;
    v_final_pa_lucro := v_paa_lucro;
    v_final_pa_ticket_medio := v_paa_ticket_medio;
    v_final_pa_margem_lucro := v_paa_margem_lucro;
  ELSE
    -- For other periods (including full month): return PAM (previous month) in pa_* fields
    v_final_pa_vendas := v_pa_vendas;
    v_final_pa_lucro := v_pa_lucro;
    v_final_pa_ticket_medio := v_pa_ticket_medio;
    v_final_pa_margem_lucro := v_pa_margem_lucro;
  END IF;

  -- ==========================================
  -- CALCULATE VARIATIONS
  -- ==========================================
  -- Month-over-month variations (always use PAM)
  IF v_pa_vendas > 0 THEN
    v_variacao_vendas_mes := ((v_total_vendas - v_pa_vendas) / v_pa_vendas) * 100;
  END IF;

  IF v_pa_lucro > 0 THEN
    v_variacao_lucro_mes := ((v_total_lucro - v_pa_lucro) / v_pa_lucro) * 100;
  END IF;

  IF v_pa_ticket_medio > 0 THEN
    v_variacao_ticket_mes := ((v_ticket_medio - v_pa_ticket_medio) / v_pa_ticket_medio) * 100;
  END IF;

  v_variacao_margem_mes := v_margem_lucro - v_pa_margem_lucro;

  -- Year-over-year variations (always use PAA)
  IF v_paa_vendas > 0 THEN
    v_variacao_vendas_ano := ((v_total_vendas - v_paa_vendas) / v_paa_vendas) * 100;
  END IF;

  IF v_paa_lucro > 0 THEN
    v_variacao_lucro_ano := ((v_total_lucro - v_paa_lucro) / v_paa_lucro) * 100;
  END IF;

  IF v_paa_ticket_medio > 0 THEN
    v_variacao_ticket_ano := ((v_ticket_medio - v_paa_ticket_medio) / v_paa_ticket_medio) * 100;
  END IF;

  v_variacao_margem_ano := v_margem_lucro - v_paa_margem_lucro;

  -- ==========================================
  -- GET YTD DATA
  -- ==========================================
  EXECUTE format('
    SELECT
      COALESCE(SUM(valor_total), 0)
    FROM %I.vendas_diarias_por_filial
    WHERE data_venda BETWEEN $1 AND $2
      AND ($3 IS NULL OR filial_id = ANY($3::INTEGER[]))
  ', schema_name)
  USING v_data_inicio_ytd, v_data_fim_ytd, p_filiais_ids
  INTO v_ytd_vendas;

  -- Get discounts for YTD if table exists
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
  END IF;

  -- Get YTD data for previous year
  EXECUTE format('
    SELECT
      COALESCE(SUM(valor_total), 0)
    FROM %I.vendas_diarias_por_filial
    WHERE data_venda BETWEEN $1 AND $2
      AND ($3 IS NULL OR filial_id = ANY($3::INTEGER[]))
  ', schema_name)
  USING v_data_inicio_ytd_ano_anterior, v_data_fim_ytd_ano_anterior, p_filiais_ids
  INTO v_ytd_vendas_ano_anterior;

  -- Get discounts for YTD previous year if table exists
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
  END IF;

  -- Calculate YTD variation
  IF v_ytd_vendas_ano_anterior > 0 THEN
    v_ytd_variacao_percent := ((v_ytd_vendas - v_ytd_vendas_ano_anterior) / v_ytd_vendas_ano_anterior) * 100;
  END IF;

  -- ==========================================
  -- GENERATE CHART DATA
  -- ==========================================
  EXECUTE format('
    SELECT COALESCE(json_agg(row_to_json(t)), ''[]''::json)
    FROM (
      SELECT
        TO_CHAR(data_venda, ''DD/MM'') as mes,
        COALESCE(SUM(CASE WHEN EXTRACT(YEAR FROM data_venda) = EXTRACT(YEAR FROM $2) THEN valor_total ELSE 0 END), 0) as ano_atual,
        COALESCE(SUM(CASE WHEN EXTRACT(YEAR FROM data_venda) = EXTRACT(YEAR FROM $2) - 1 THEN valor_total ELSE 0 END), 0) as ano_anterior
      FROM %I.vendas_diarias_por_filial
      WHERE data_venda BETWEEN $1 AND $2
        AND ($3 IS NULL OR filial_id = ANY($3::INTEGER[]))
      GROUP BY data_venda
      ORDER BY data_venda
    ) t
  ', schema_name)
  USING p_data_inicio, p_data_fim, p_filiais_ids
  INTO v_grafico_vendas;

  -- ==========================================
  -- RETURN RESULTS (using v_final_pa_* values)
  -- ==========================================
  RETURN QUERY SELECT
    v_total_vendas,
    v_total_lucro,
    v_ticket_medio,
    v_margem_lucro,
    v_final_pa_vendas,        -- Returns correct comparison (PAA for full year, PAM for others)
    v_final_pa_lucro,          -- Returns correct comparison
    v_final_pa_ticket_medio,   -- Returns correct comparison
    v_final_pa_margem_lucro,   -- Returns correct comparison
    v_variacao_vendas_mes,
    v_variacao_lucro_mes,
    v_variacao_ticket_mes,
    v_variacao_margem_mes,
    v_variacao_vendas_ano,
    v_variacao_lucro_ano,
    v_variacao_ticket_ano,
    v_variacao_margem_ano,
    v_ytd_vendas,
    v_ytd_vendas_ano_anterior,
    v_ytd_variacao_percent,
    v_grafico_vendas,
    NULL::TEXT;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_dashboard_data(TEXT, DATE, DATE, TEXT[]) TO anon, authenticated, service_role;

-- Add comment
COMMENT ON FUNCTION public.get_dashboard_data IS 
'Dashboard data with intelligent comparison: full year returns PAA, full month returns complete previous month, custom periods return same duration shifted back';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
