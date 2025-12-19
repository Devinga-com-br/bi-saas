-- =====================================================
-- Migration: Add DRE Comparativo function with date parameters
-- Date: 2025-12-19
-- Description:
--   - Creates get_dre_comparativo_data_v2 that accepts date range directly
--   - Allows custom period filtering (not just month/year)
-- =====================================================

-- Drop existing v2 function if exists
DROP FUNCTION IF EXISTS public.get_dre_comparativo_data_v2(TEXT, INTEGER[], DATE, DATE);

CREATE OR REPLACE FUNCTION public.get_dre_comparativo_data_v2(
  p_schema TEXT,
  p_filiais_ids INTEGER[],
  p_data_inicio DATE,
  p_data_fim DATE
)
RETURNS TABLE (
  receita_bruta_pdv NUMERIC,
  receita_bruta_faturamento NUMERIC,
  receita_bruta NUMERIC,
  desconto_venda NUMERIC,
  receita_liquida NUMERIC,
  cmv_pdv NUMERIC,
  cmv_faturamento NUMERIC,
  cmv NUMERIC,
  lucro_bruto NUMERIC,
  margem_bruta NUMERIC,
  despesas_operacionais NUMERIC,
  resultado_operacional NUMERIC,
  margem_operacional NUMERIC,
  despesas_json JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_receita_bruta_pdv NUMERIC := 0;
  v_cmv_pdv NUMERIC := 0;
  v_receita_bruta_faturamento NUMERIC := 0;
  v_cmv_faturamento NUMERIC := 0;
  v_receita_bruta NUMERIC := 0;
  v_desconto_venda NUMERIC := 0;
  v_receita_liquida NUMERIC := 0;
  v_cmv NUMERIC := 0;
  v_lucro_bruto NUMERIC := 0;
  v_margem_bruta NUMERIC := 0;
  v_despesas_operacionais NUMERIC := 0;
  v_resultado_operacional NUMERIC := 0;
  v_margem_operacional NUMERIC := 0;
  v_despesas_json JSONB := '[]'::JSONB;
  v_table_exists BOOLEAN;
BEGIN
  -- Validate parameters
  IF p_schema IS NULL OR p_schema = '' THEN
    RAISE EXCEPTION 'Schema is required';
  END IF;
  IF p_data_inicio IS NULL OR p_data_fim IS NULL THEN
    RAISE EXCEPTION 'Date range is required';
  END IF;
  IF p_data_inicio > p_data_fim THEN
    RAISE EXCEPTION 'Start date must be before or equal to end date';
  END IF;
  IF p_filiais_ids IS NULL OR array_length(p_filiais_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'At least one branch is required';
  END IF;

  -- RECEITA BRUTA PDV (vendas_diarias_por_filial)
  EXECUTE format('
    SELECT COALESCE(SUM(valor_total), 0)::NUMERIC
    FROM %I.vendas_diarias_por_filial
    WHERE data_venda BETWEEN $1 AND $2 AND filial_id = ANY($3)
  ', p_schema) INTO v_receita_bruta_pdv USING p_data_inicio, p_data_fim, p_filiais_ids;

  -- CMV PDV
  EXECUTE format('
    SELECT COALESCE(SUM(custo_total), 0)::NUMERIC
    FROM %I.vendas_diarias_por_filial
    WHERE data_venda BETWEEN $1 AND $2 AND filial_id = ANY($3)
  ', p_schema) INTO v_cmv_pdv USING p_data_inicio, p_data_fim, p_filiais_ids;

  -- FATURAMENTO (if table exists)
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = %L AND table_name = ''faturamento'')', p_schema) INTO v_table_exists;

  IF v_table_exists THEN
    -- Revenue: valor_contabil per DISTINCT nota (no transaction filter)
    EXECUTE format('
      SELECT COALESCE(SUM(valor_contabil), 0)::NUMERIC
      FROM (
        SELECT DISTINCT ON (id_saida) id_saida, valor_contabil
        FROM %I.faturamento
        WHERE data_saida BETWEEN $1 AND $2
          AND (cancelado IS NULL OR cancelado = '' '' OR cancelado = '''')
          AND filial_id = ANY($3)
      ) notas_unicas
    ', p_schema) INTO v_receita_bruta_faturamento USING p_data_inicio, p_data_fim, p_filiais_ids;

    -- CMV: SUM(quantidade * custo_medio)
    EXECUTE format('
      SELECT COALESCE(SUM(quantidade * custo_medio), 0)::NUMERIC
      FROM %I.faturamento
      WHERE data_saida BETWEEN $1 AND $2
        AND (cancelado IS NULL OR cancelado = '' '' OR cancelado = '''')
        AND filial_id = ANY($3)
    ', p_schema) INTO v_cmv_faturamento USING p_data_inicio, p_data_fim, p_filiais_ids;
  END IF;

  v_receita_bruta := v_receita_bruta_pdv + v_receita_bruta_faturamento;
  v_cmv := v_cmv_pdv + v_cmv_faturamento;

  -- DISCOUNT
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = %L AND table_name = ''descontos_venda'')', p_schema) INTO v_table_exists;
  IF v_table_exists THEN
    EXECUTE format('SELECT COALESCE(SUM(valor_desconto), 0)::NUMERIC FROM %I.descontos_venda WHERE data_desconto BETWEEN $1 AND $2 AND filial_id = ANY($3)', p_schema)
    INTO v_desconto_venda USING p_data_inicio, p_data_fim, p_filiais_ids;
  END IF;

  v_receita_liquida := v_receita_bruta - v_desconto_venda;
  v_lucro_bruto := v_receita_liquida - v_cmv;
  IF v_receita_liquida > 0 THEN v_margem_bruta := (v_lucro_bruto / v_receita_liquida) * 100; END IF;

  -- EXPENSES
  EXECUTE format('
    SELECT COALESCE(SUM(desp.valor), 0)::NUMERIC,
      COALESCE(jsonb_agg(jsonb_build_object(''departamento_id'', d.id, ''departamento'', d.descricao, ''valor'', dept_totals.valor_total) ORDER BY dept_totals.valor_total DESC) FILTER (WHERE d.id IS NOT NULL), ''[]''::JSONB)
    FROM %I.despesas desp
    INNER JOIN %I.tipos_despesa td ON desp.id_tipo_despesa = td.id
    INNER JOIN %I.departamentos_nivel1 d ON td.departamentalizacao_nivel1 = d.id
    LEFT JOIN LATERAL (SELECT d2.id, SUM(desp2.valor) as valor_total FROM %I.despesas desp2 INNER JOIN %I.tipos_despesa td2 ON desp2.id_tipo_despesa = td2.id INNER JOIN %I.departamentos_nivel1 d2 ON td2.departamentalizacao_nivel1 = d2.id WHERE desp2.data_despesa BETWEEN $1 AND $2 AND desp2.filial_id = ANY($3) GROUP BY d2.id) dept_totals ON dept_totals.id = d.id
    WHERE desp.data_despesa BETWEEN $1 AND $2 AND desp.filial_id = ANY($3)
  ', p_schema, p_schema, p_schema, p_schema, p_schema, p_schema) INTO v_despesas_operacionais, v_despesas_json USING p_data_inicio, p_data_fim, p_filiais_ids;

  v_despesas_json := (SELECT COALESCE(jsonb_agg(DISTINCT elem), '[]'::JSONB) FROM jsonb_array_elements(v_despesas_json) elem);

  v_resultado_operacional := v_lucro_bruto - v_despesas_operacionais;
  IF v_receita_liquida > 0 THEN v_margem_operacional := (v_resultado_operacional / v_receita_liquida) * 100; END IF;

  RETURN QUERY SELECT v_receita_bruta_pdv, v_receita_bruta_faturamento, v_receita_bruta, v_desconto_venda, v_receita_liquida, v_cmv_pdv, v_cmv_faturamento, v_cmv, v_lucro_bruto, v_margem_bruta, v_despesas_operacionais, v_resultado_operacional, v_margem_operacional, v_despesas_json;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dre_comparativo_data_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dre_comparativo_data_v2 TO service_role;

COMMENT ON FUNCTION public.get_dre_comparativo_data_v2 IS
'[Module: DRE Comparativo v2] Returns DRE data for a custom date range.
Accepts p_data_inicio and p_data_fim directly instead of month/year.
Allows flexible period filtering (custom dates, full year, etc).';
