-- =====================================================
-- Migration: Atualizar get_dre_comparativo_data para incluir faturamento
-- Date: 2025-12-05
-- Description: Adiciona receita e CMV de faturamento ao DRE Comparativo
-- =====================================================

-- Drop existing function
DROP FUNCTION IF EXISTS public.get_dre_comparativo_data(TEXT, INTEGER[], INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.get_dre_comparativo_data(
  p_schema TEXT,
  p_filiais_ids INTEGER[],
  p_mes INTEGER,
  p_ano INTEGER
)
RETURNS TABLE (
  -- Receita PDV
  receita_bruta_pdv NUMERIC,
  -- Receita Faturamento
  receita_bruta_faturamento NUMERIC,
  -- Receita Total (PDV + Faturamento)
  receita_bruta NUMERIC,
  -- Desconto
  desconto_venda NUMERIC,
  -- Receita Líquida
  receita_liquida NUMERIC,
  -- CMV PDV
  cmv_pdv NUMERIC,
  -- CMV Faturamento
  cmv_faturamento NUMERIC,
  -- CMV Total
  cmv NUMERIC,
  -- Lucro Bruto
  lucro_bruto NUMERIC,
  margem_bruta NUMERIC,
  -- Despesas
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
  v_sql TEXT;
  v_data_inicio DATE;
  v_data_fim DATE;

  -- Resultados PDV
  v_receita_bruta_pdv NUMERIC := 0;
  v_cmv_pdv NUMERIC := 0;

  -- Resultados Faturamento
  v_receita_bruta_faturamento NUMERIC := 0;
  v_cmv_faturamento NUMERIC := 0;

  -- Totais
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
    RAISE EXCEPTION 'Schema é obrigatório';
  END IF;

  IF p_mes < 1 OR p_mes > 12 THEN
    RAISE EXCEPTION 'Mês deve estar entre 1 e 12';
  END IF;

  IF p_ano < 2000 OR p_ano > 2100 THEN
    RAISE EXCEPTION 'Ano inválido';
  END IF;

  IF p_filiais_ids IS NULL OR array_length(p_filiais_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Ao menos uma filial é obrigatória';
  END IF;

  -- Calculate date range
  v_data_inicio := make_date(p_ano, p_mes, 1);
  v_data_fim := (v_data_inicio + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  -- =========================================
  -- 1. RECEITA BRUTA PDV (vendas_diarias_por_filial)
  -- =========================================
  EXECUTE format('
    SELECT COALESCE(SUM(valor_total), 0)::NUMERIC
    FROM %I.vendas_diarias_por_filial
    WHERE data_venda BETWEEN $1 AND $2
      AND filial_id = ANY($3)
  ', p_schema)
  INTO v_receita_bruta_pdv
  USING v_data_inicio, v_data_fim, p_filiais_ids;

  -- =========================================
  -- 1.1 CMV PDV (custo_total from vendas_diarias_por_filial)
  -- =========================================
  EXECUTE format('
    SELECT COALESCE(SUM(custo_total), 0)::NUMERIC
    FROM %I.vendas_diarias_por_filial
    WHERE data_venda BETWEEN $1 AND $2
      AND filial_id = ANY($3)
  ', p_schema)
  INTO v_cmv_pdv
  USING v_data_inicio, v_data_fim, p_filiais_ids;

  -- =========================================
  -- 2. RECEITA E CMV FATURAMENTO (tabela faturamento se existir)
  -- =========================================
  EXECUTE format('
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = %L AND table_name = ''faturamento''
    )', p_schema) INTO v_table_exists;

  IF v_table_exists THEN
    -- Receita Faturamento (valor_contabil por nota, usando DISTINCT ON)
    EXECUTE format('
      SELECT COALESCE(SUM(valor_contabil), 0)::NUMERIC
      FROM (
        SELECT DISTINCT ON (id_saida) id_saida, valor_contabil
        FROM %I.faturamento
        WHERE data_saida BETWEEN $1 AND $2
          AND transacao = ''V''
          AND (cancelado IS NULL OR cancelado = '' '' OR cancelado = '''')
          AND filial_id = ANY($3)
      ) notas_unicas
    ', p_schema)
    INTO v_receita_bruta_faturamento
    USING v_data_inicio, v_data_fim, p_filiais_ids;

    -- CMV Faturamento (custo_sem_icms por produto)
    EXECUTE format('
      SELECT COALESCE(SUM(custo_sem_icms), 0)::NUMERIC
      FROM %I.faturamento
      WHERE data_saida BETWEEN $1 AND $2
        AND transacao = ''V''
        AND (cancelado IS NULL OR cancelado = '' '' OR cancelado = '''')
        AND filial_id = ANY($3)
    ', p_schema)
    INTO v_cmv_faturamento
    USING v_data_inicio, v_data_fim, p_filiais_ids;
  END IF;

  -- =========================================
  -- 3. TOTAIS
  -- =========================================
  v_receita_bruta := v_receita_bruta_pdv + v_receita_bruta_faturamento;
  v_cmv := v_cmv_pdv + v_cmv_faturamento;

  -- =========================================
  -- 4. DESCONTO DE VENDA (descontos_venda - if exists)
  -- =========================================
  EXECUTE format('
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = %L AND table_name = ''descontos_venda''
    )', p_schema) INTO v_table_exists;

  IF v_table_exists THEN
    EXECUTE format('
      SELECT COALESCE(SUM(valor_desconto), 0)::NUMERIC
      FROM %I.descontos_venda
      WHERE data_desconto BETWEEN $1 AND $2
        AND filial_id = ANY($3)
    ', p_schema)
    INTO v_desconto_venda
    USING v_data_inicio, v_data_fim, p_filiais_ids;
  END IF;

  -- =========================================
  -- 5. RECEITA LÍQUIDA
  -- =========================================
  v_receita_liquida := v_receita_bruta - v_desconto_venda;

  -- =========================================
  -- 6. LUCRO BRUTO e MARGEM BRUTA
  -- =========================================
  v_lucro_bruto := v_receita_liquida - v_cmv;
  IF v_receita_liquida > 0 THEN
    v_margem_bruta := (v_lucro_bruto / v_receita_liquida) * 100;
  END IF;

  -- =========================================
  -- 7. DESPESAS OPERACIONAIS (by department)
  -- =========================================
  EXECUTE format('
    SELECT
      COALESCE(SUM(desp.valor), 0)::NUMERIC,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            ''departamento_id'', d.id,
            ''departamento'', d.descricao,
            ''valor'', dept_totals.valor_total
          ) ORDER BY dept_totals.valor_total DESC
        ) FILTER (WHERE d.id IS NOT NULL),
        ''[]''::JSONB
      )
    FROM %I.despesas desp
    INNER JOIN %I.tipos_despesa td ON desp.id_tipo_despesa = td.id
    INNER JOIN %I.departamentos_nivel1 d ON td.departamentalizacao_nivel1 = d.id
    LEFT JOIN LATERAL (
      SELECT
        d2.id,
        SUM(desp2.valor) as valor_total
      FROM %I.despesas desp2
      INNER JOIN %I.tipos_despesa td2 ON desp2.id_tipo_despesa = td2.id
      INNER JOIN %I.departamentos_nivel1 d2 ON td2.departamentalizacao_nivel1 = d2.id
      WHERE desp2.data_despesa BETWEEN $1 AND $2
        AND desp2.filial_id = ANY($3)
      GROUP BY d2.id
    ) dept_totals ON dept_totals.id = d.id
    WHERE desp.data_despesa BETWEEN $1 AND $2
      AND desp.filial_id = ANY($3)
  ', p_schema, p_schema, p_schema, p_schema, p_schema, p_schema)
  INTO v_despesas_operacionais, v_despesas_json
  USING v_data_inicio, v_data_fim, p_filiais_ids;

  -- Remove duplicates from despesas_json (due to LATERAL join)
  v_despesas_json := (
    SELECT COALESCE(jsonb_agg(DISTINCT elem), '[]'::JSONB)
    FROM jsonb_array_elements(v_despesas_json) elem
  );

  -- =========================================
  -- 8. RESULTADO OPERACIONAL e MARGEM OPERACIONAL
  -- =========================================
  v_resultado_operacional := v_lucro_bruto - v_despesas_operacionais;
  IF v_receita_liquida > 0 THEN
    v_margem_operacional := (v_resultado_operacional / v_receita_liquida) * 100;
  END IF;

  -- Return results
  RETURN QUERY SELECT
    v_receita_bruta_pdv,
    v_receita_bruta_faturamento,
    v_receita_bruta,
    v_desconto_venda,
    v_receita_liquida,
    v_cmv_pdv,
    v_cmv_faturamento,
    v_cmv,
    v_lucro_bruto,
    v_margem_bruta,
    v_despesas_operacionais,
    v_resultado_operacional,
    v_margem_operacional,
    v_despesas_json;
END;
$$;

-- Comments
COMMENT ON FUNCTION public.get_dre_comparativo_data IS
'[Module: DRE Comparativo] Returns DRE data for a specific period and set of branches.
Now includes PDV and Faturamento breakdown for receita and CMV.
Parameters:
  - p_schema: Tenant schema name
  - p_filiais_ids: Array of branch IDs to include
  - p_mes: Month (1-12)
  - p_ano: Year (e.g., 2025)
Return: Single row with DRE metrics including PDV/Faturamento breakdown.';

-- Permissions
GRANT EXECUTE ON FUNCTION public.get_dre_comparativo_data TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dre_comparativo_data TO service_role;
