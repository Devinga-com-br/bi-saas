-- =====================================================
-- CORREÇÃO: Aplicação de desconto_custo no CMV
-- Data: 2024-11-22
-- Descrição: Corrige o cálculo do lucro bruto para aplicar
--            desconto_custo ao invés de valor_desconto
-- =====================================================

-- =====================================================
-- PARTE 1: BACKUP DA FUNÇÃO ORIGINAL (PARA REVERSÃO)
-- =====================================================
-- Para reverter, execute apenas esta parte:

/*
-- COMANDO PARA REVERTER (SE NECESSÁRIO):
CREATE OR REPLACE FUNCTION public.get_dashboard_data(
  schema_name text,
  p_data_inicio date,
  p_data_fim date,
  p_filiais_ids text[] DEFAULT NULL::text[]
)
RETURNS TABLE(
  total_vendas numeric,
  total_lucro numeric,
  ticket_medio numeric,
  margem_lucro numeric,
  pa_vendas numeric,
  pa_lucro numeric,
  pa_ticket_medio numeric,
  pa_margem_lucro numeric,
  variacao_vendas_mes numeric,
  variacao_lucro_mes numeric,
  variacao_ticket_mes numeric,
  variacao_margem_mes numeric,
  variacao_vendas_ano numeric,
  variacao_lucro_ano numeric,
  variacao_ticket_ano numeric,
  variacao_margem_ano numeric,
  ytd_vendas numeric,
  ytd_vendas_ano_anterior numeric,
  ytd_variacao_percent numeric,
  grafico_vendas json,
  reserved text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$;
*/

-- =====================================================
-- PARTE 2: NOVA VERSÃO CORRIGIDA
-- =====================================================
-- Aplica a correção do desconto_custo no cálculo do lucro bruto

CREATE OR REPLACE FUNCTION public.get_dashboard_data(
  schema_name text,
  p_data_inicio date,
  p_data_fim date,
  p_filiais_ids text[] DEFAULT NULL::text[]
)
RETURNS TABLE(
  total_vendas numeric,
  total_lucro numeric,
  ticket_medio numeric,
  margem_lucro numeric,
  pa_vendas numeric,
  pa_lucro numeric,
  pa_ticket_medio numeric,
  pa_margem_lucro numeric,
  variacao_vendas_mes numeric,
  variacao_lucro_mes numeric,
  variacao_ticket_mes numeric,
  variacao_margem_mes numeric,
  variacao_vendas_ano numeric,
  variacao_lucro_ano numeric,
  variacao_ticket_ano numeric,
  variacao_margem_ano numeric,
  ytd_vendas numeric,
  ytd_vendas_ano_anterior numeric,
  ytd_variacao_percent numeric,
  grafico_vendas json,
  reserved text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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

  -- CORREÇÃO: Agora separamos desconto de venda e desconto de custo
  v_descontos_venda_periodo NUMERIC := 0;
  v_descontos_custo_periodo NUMERIC := 0;
  v_descontos_venda_pa NUMERIC := 0;
  v_descontos_custo_pa NUMERIC := 0;
  v_descontos_venda_paa NUMERIC := 0;
  v_descontos_custo_paa NUMERIC := 0;
  v_descontos_venda_ytd NUMERIC := 0;
  v_descontos_venda_ytd_ano_anterior NUMERIC := 0;

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

  -- ========== PERÍODO ATUAL ==========
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

  -- CORREÇÃO: Buscar desconto_venda E desconto_custo separadamente
  IF v_table_exists THEN
    EXECUTE format('
      SELECT
        COALESCE(SUM(valor_desconto), 0),
        COALESCE(SUM(desconto_custo), 0)
      FROM %I.descontos_venda
      WHERE data_desconto BETWEEN $1 AND $2
        AND ($3 IS NULL OR filial_id = ANY($3::INTEGER[]))
    ', schema_name)
    USING p_data_inicio, p_data_fim, p_filiais_ids
    INTO v_descontos_venda_periodo, v_descontos_custo_periodo;

    -- Aplicar desconto de venda na receita
    v_total_vendas := v_total_vendas - v_descontos_venda_periodo;

    -- CORREÇÃO: Ajustar lucro considerando ambos os descontos
    -- Lucro = Vendas - Custo
    -- Se vendas diminui por desconto_venda, lucro diminui
    -- Se custo diminui por desconto_custo, lucro aumenta
    v_total_lucro := v_total_lucro - v_descontos_venda_periodo + v_descontos_custo_periodo;
  END IF;

  -- Calculate current period metrics
  IF v_total_transacoes > 0 THEN
    v_ticket_medio := v_total_vendas / v_total_transacoes;
  END IF;

  IF v_total_vendas > 0 THEN
    v_margem_lucro := (v_total_lucro / v_total_vendas) * 100;
  END IF;

  -- ========== PERÍODO ANTERIOR MESMO (PAM) ==========
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

  -- CORREÇÃO: Buscar ambos os descontos para PAM
  IF v_table_exists THEN
    EXECUTE format('
      SELECT
        COALESCE(SUM(valor_desconto), 0),
        COALESCE(SUM(desconto_custo), 0)
      FROM %I.descontos_venda
      WHERE data_desconto BETWEEN $1 AND $2
        AND ($3 IS NULL OR filial_id = ANY($3::INTEGER[]))
    ', schema_name)
    USING v_data_inicio_pa, v_data_fim_pa, p_filiais_ids
    INTO v_descontos_venda_pa, v_descontos_custo_pa;

    v_pa_vendas := v_pa_vendas - v_descontos_venda_pa;
    v_pa_lucro := v_pa_lucro - v_descontos_venda_pa + v_descontos_custo_pa;
  END IF;

  -- Calculate PAM metrics
  IF v_pa_transacoes > 0 THEN
    v_pa_ticket_medio := v_pa_vendas / v_pa_transacoes;
  END IF;

  IF v_pa_vendas > 0 THEN
    v_pa_margem_lucro := (v_pa_lucro / v_pa_vendas) * 100;
  END IF;

  -- ========== PERÍODO ANTERIOR ACUMULADO (PAA) ==========
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

  -- CORREÇÃO: Buscar ambos os descontos para PAA
  IF v_table_exists THEN
    EXECUTE format('
      SELECT
        COALESCE(SUM(valor_desconto), 0),
        COALESCE(SUM(desconto_custo), 0)
      FROM %I.descontos_venda
      WHERE data_desconto BETWEEN $1 AND $2
        AND ($3 IS NULL OR filial_id = ANY($3::INTEGER[]))
    ', schema_name)
    USING v_data_inicio_paa, v_data_fim_paa, p_filiais_ids
    INTO v_descontos_venda_paa, v_descontos_custo_paa;

    v_paa_vendas := v_paa_vendas - v_descontos_venda_paa;
    v_paa_lucro := v_paa_lucro - v_descontos_venda_paa + v_descontos_custo_paa;
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

  -- ========== YTD ==========
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

  -- Get discounts for YTD if table exists (apenas valor_desconto para vendas YTD)
  IF v_table_exists THEN
    EXECUTE format('
      SELECT COALESCE(SUM(valor_desconto), 0)
      FROM %I.descontos_venda
      WHERE data_desconto BETWEEN $1 AND $2
        AND ($3 IS NULL OR filial_id = ANY($3::INTEGER[]))
    ', schema_name)
    USING v_data_inicio_ytd, v_data_fim_ytd, p_filiais_ids
    INTO v_descontos_venda_ytd;

    v_ytd_vendas := v_ytd_vendas - v_descontos_venda_ytd;
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
    INTO v_descontos_venda_ytd_ano_anterior;

    v_ytd_vendas_ano_anterior := v_ytd_vendas_ano_anterior - v_descontos_venda_ytd_ano_anterior;
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
$function$;

-- =====================================================
-- PARTE 3: SCRIPT DE TESTE (OPCIONAL)
-- =====================================================
-- Use este script para testar a correção antes de aplicar em produção

/*
-- Teste com dados fictícios para validar o cálculo
-- Execute em ambiente de desenvolvimento primeiro

-- 1. Criar dados de teste
INSERT INTO okilao.descontos_venda (filial_id, data_desconto, valor_desconto, desconto_custo, observacao)
VALUES
  (1, '2024-11-01', 1000.00, 600.00, 'Teste de desconto'),
  (1, '2024-11-02', 500.00, 300.00, 'Teste de desconto 2');

-- 2. Testar a função antiga vs nova
-- Antiga (antes da correção):
SELECT * FROM get_dashboard_data('okilao', '2024-11-01', '2024-11-30', NULL);

-- 3. Aplicar a correção
-- Execute a PARTE 2 deste script

-- 4. Testar a função nova (após correção):
SELECT * FROM get_dashboard_data('okilao', '2024-11-01', '2024-11-30', NULL);

-- 5. Comparar os resultados:
-- - total_lucro deve ser MAIOR na versão corrigida
-- - margem_lucro deve refletir o cálculo correto

-- 6. Limpar dados de teste
DELETE FROM okilao.descontos_venda WHERE observacao LIKE 'Teste%';
*/

-- =====================================================
-- INSTRUÇÕES DE APLICAÇÃO
-- =====================================================
/*
PASSO A PASSO PARA APLICAÇÃO SEGURA:

1. BACKUP PREVENTIVO:
   - Faça backup do banco de dados antes de aplicar
   - Salve este arquivo com o backup da função original

2. TESTE EM DESENVOLVIMENTO:
   - Execute a PARTE 3 (script de teste) em ambiente dev
   - Valide que os cálculos estão corretos
   - Compare resultados antes/depois

3. APLICAÇÃO EM PRODUÇÃO:
   - Execute apenas a PARTE 2 (nova versão) em produção
   - Monitore os dashboards por 15 minutos
   - Verifique se os valores de lucro e margem estão coerentes

4. EM CASO DE PROBLEMAS:
   - Execute o comando de reversão (PARTE 1 descomentada)
   - Notifique a equipe sobre o rollback
   - Analise os logs para identificar o problema

5. VALIDAÇÃO PÓS-DEPLOY:
   - Verifique o Dashboard principal
   - Verifique o DRE Gerencial
   - Compare com relatórios anteriores
   - Confirme que CMV está sendo calculado corretamente

NOTA: A correção afeta apenas tenants que usam o módulo de descontos.
      Tenants sem descontos não serão impactados.
*/