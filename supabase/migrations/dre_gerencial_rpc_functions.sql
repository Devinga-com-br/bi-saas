-- =====================================================
-- Migration: RPC Functions for DRE Gerencial Module
-- Created: 2025-01-11
-- Description: Creates the two main RPC functions used by the DRE Gerencial module
--   1. get_despesas_hierarquia - Retrieves hierarchical expense data
--   2. get_dashboard_data - Retrieves dashboard indicators with temporal comparisons
-- =====================================================

-- =====================================================
-- FUNCTION 1: get_despesas_hierarquia
-- =====================================================
-- Purpose: Fetches expense data organized by 3-level hierarchy:
--   Department (nivel1) → Expense Type → Individual Expense
--
-- Parameters:
--   p_schema: Schema name of the tenant (e.g., 'okilao', 'saoluiz')
--   p_filial_id: Branch ID filter
--   p_data_inicial: Start date for filtering
--   p_data_final: End date for filtering
--   p_tipo_data: NOT USED (kept for backward compatibility)
--
-- Returns: Flat table with expense records (max 10000 rows per call)
--
-- Tables used:
--   - {schema}.despesas
--   - {schema}.tipos_despesa (singular)
--   - {schema}.departamentos_nivel1
--
-- Important notes:
--   - ALWAYS filters by despesas.data_despesa (ignores p_tipo_data parameter)
--   - LIMIT 10000 rows (increased to support annual periods)
--   - Uses departamentalizacao_nivel1 for department association
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_despesas_hierarquia(
  p_schema TEXT,
  p_filial_id INTEGER,
  p_data_inicial DATE,
  p_data_final DATE,
  p_tipo_data TEXT DEFAULT 'data_emissao'
)
RETURNS TABLE (
  dept_id INTEGER,
  dept_descricao TEXT,
  tipo_id INTEGER,
  tipo_descricao TEXT,
  data_emissao DATE,
  descricao_despesa TEXT,
  id_fornecedor INTEGER,
  numero_nota BIGINT,
  serie_nota VARCHAR,
  valor NUMERIC,
  usuario VARCHAR,
  observacao TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY EXECUTE format('
    SELECT
      d.id AS dept_id,
      d.descricao AS dept_descricao,
      td.id AS tipo_id,
      td.descricao AS tipo_descricao,
      desp.data_emissao,
      desp.descricao_despesa AS descricao_despesa,
      desp.id_fornecedor,
      desp.numero_nota,
      desp.serie_nota,
      desp.valor,
      desp.usuario,
      desp.observacao
    FROM %I.despesas desp
    INNER JOIN %I.tipos_despesa td ON desp.id_tipo_despesa = td.id
    INNER JOIN %I.departamentos_nivel1 d ON td.departamentalizacao_nivel1 = d.id
    WHERE desp.filial_id = $1
      AND desp.data_despesa BETWEEN $2 AND $3
    ORDER BY d.descricao, td.descricao, desp.data_despesa DESC
    LIMIT 10000
  ', p_schema, p_schema, p_schema)
  USING p_filial_id, p_data_inicial, p_data_final;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_despesas_hierarquia(TEXT, INTEGER, DATE, DATE, TEXT) TO anon, authenticated, service_role;

-- =====================================================
-- FUNCTION 2: get_dashboard_data
-- =====================================================
-- Purpose: Fetches comprehensive dashboard indicators with automatic temporal comparisons
--
-- Parameters:
--   schema_name: Schema name of the tenant
--   p_data_inicio: Start date of current period
--   p_data_fim: End date of current period
--   p_filiais_ids: Array of branch IDs (NULL = all branches)
--
-- Returns: Single row with 21 columns:
--   - Current period metrics (4): total_vendas, total_lucro, ticket_medio, margem_lucro
--   - PAM - Previous Month (4): pa_vendas, pa_lucro, pa_ticket_medio, pa_margem_lucro
--   - Month-over-month variations (4): variacao_vendas_mes, variacao_lucro_mes, variacao_ticket_mes, variacao_margem_mes
--   - Year-over-year variations (4): variacao_vendas_ano, variacao_lucro_ano, variacao_ticket_ano, variacao_margem_ano
--   - YTD metrics (3): ytd_vendas, ytd_vendas_ano_anterior, ytd_variacao_percent
--   - Chart data (1): grafico_vendas (JSONB array)
--   - Reserved (1): reserved
--
-- Tables used:
--   - {schema}.vendas_diarias_por_filial (aggregated sales data)
--   - {schema}.descontos_venda (optional - if exists, discounts are subtracted)
--
-- Important notes:
--   - Automatically calculates PAM (previous month) and PAA (previous year) comparisons
--   - Handles discounts if descontos_venda table exists
--   - Generates JSONB chart data for daily comparisons
--   - DRE Gerencial module uses only 3 of 21 fields (total_vendas, total_lucro, margem_lucro)
--   - Other modules (Dashboard Principal) can use all 21 fields
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
BEGIN
  -- Calculate PAM (Período Anterior Mesmo) dates
  v_data_inicio_pa := (p_data_inicio - INTERVAL '1 month')::DATE;
  v_data_fim_pa := (p_data_fim - INTERVAL '1 month')::DATE;

  -- Calculate PAA (Período Anterior Acumulado / Ano anterior) dates
  v_data_inicio_paa := (p_data_inicio - INTERVAL '1 year')::DATE;
  v_data_fim_paa := (p_data_fim - INTERVAL '1 year')::DATE;

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

  -- Get current period data
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

  -- Get PAM data
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

  -- Get PAA data
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

  -- Calculate month-over-month variations
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

  -- Calculate year-over-year variations
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

  -- Get YTD data
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

  -- Generate chart data (daily comparison)
  EXECUTE format('
    SELECT COALESCE(
      json_agg(
        json_build_object(
          ''mes'', TO_CHAR(data_venda, ''DD/MM''),
          ''ano_atual'', vendas_atual,
          ''ano_anterior'', vendas_anterior
        ) ORDER BY data_venda
      ),
      ''[]''::JSON
    )
    FROM (
      SELECT
        v1.data_venda,
        COALESCE(SUM(v1.valor_total), 0) as vendas_atual,
        COALESCE(SUM(v2.valor_total), 0) as vendas_anterior
      FROM %I.vendas_diarias_por_filial v1
      LEFT JOIN %I.vendas_diarias_por_filial v2
        ON v2.data_venda = (v1.data_venda - INTERVAL ''1 year'')::DATE
        AND ($3 IS NULL OR v2.filial_id = ANY($3::INTEGER[]))
      WHERE v1.data_venda BETWEEN $1 AND $2
        AND ($3 IS NULL OR v1.filial_id = ANY($3::INTEGER[]))
      GROUP BY v1.data_venda
    ) dados
  ', schema_name, schema_name)
  USING p_data_inicio, p_data_fim, p_filiais_ids
  INTO v_grafico_vendas;

  -- Return all metrics
  RETURN QUERY SELECT
    v_total_vendas,
    v_total_lucro,
    v_ticket_medio,
    v_margem_lucro,
    v_pa_vendas,
    v_pa_lucro,
    v_pa_ticket_medio,
    v_pa_margem_lucro,
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

-- =====================================================
-- End of migration
-- =====================================================
