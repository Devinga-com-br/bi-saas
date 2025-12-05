-- =====================================================
-- Migration: Corrigir lógica de cálculo de faturamento
-- Date: 2025-12-05
-- Description:
--   - Faturamento usa transacao = 'P' (Prazo), não 'V' (Vista)
--   - O DISTINCT deve ser apenas por id_saida (sem transacao na lista)
--   - Receita = SUM de valor_contabil por nota DISTINTA
--   - CMV = SUM de (quantidade * custo_medio) de todos os itens
-- =====================================================

-- =====================================================
-- FUNÇÃO 1: get_faturamento_data (CORRIGIDA)
-- =====================================================
DROP FUNCTION IF EXISTS public.get_faturamento_data(TEXT, DATE, DATE, INTEGER[]);

CREATE OR REPLACE FUNCTION public.get_faturamento_data(
  p_schema TEXT,
  p_data_inicio DATE,
  p_data_fim DATE,
  p_filiais_ids INTEGER[] DEFAULT NULL
)
RETURNS TABLE (
  receita_faturamento NUMERIC,
  cmv_faturamento NUMERIC,
  lucro_bruto_faturamento NUMERIC,
  qtd_notas INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_receita NUMERIC := 0;
  v_cmv NUMERIC := 0;
  v_qtd_notas INTEGER := 0;
  v_table_exists BOOLEAN;
BEGIN
  -- Verificar se tabela faturamento existe no schema
  EXECUTE format('
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = %L AND table_name = ''faturamento''
    )', p_schema) INTO v_table_exists;

  IF NOT v_table_exists THEN
    RETURN QUERY SELECT 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::INTEGER;
    RETURN;
  END IF;

  -- Calcular Receita: valor_contabil por nota DISTINTA
  -- IMPORTANTE: Não filtrar por transacao, apenas por nota distinta
  EXECUTE format('
    SELECT COALESCE(SUM(valor_contabil), 0)::NUMERIC
    FROM (
      SELECT DISTINCT ON (id_saida) id_saida, valor_contabil
      FROM %I.faturamento
      WHERE data_saida BETWEEN $1 AND $2
        AND (cancelado IS NULL OR cancelado = '' '' OR cancelado = '''')
        AND ($3 IS NULL OR filial_id = ANY($3))
    ) notas_unicas
  ', p_schema)
  INTO v_receita
  USING p_data_inicio, p_data_fim, p_filiais_ids;

  -- Calcular CMV: SUM(quantidade * custo_medio) de todos os itens
  EXECUTE format('
    SELECT COALESCE(SUM(quantidade * custo_medio), 0)::NUMERIC
    FROM %I.faturamento
    WHERE data_saida BETWEEN $1 AND $2
      AND (cancelado IS NULL OR cancelado = '' '' OR cancelado = '''')
      AND ($3 IS NULL OR filial_id = ANY($3))
  ', p_schema)
  INTO v_cmv
  USING p_data_inicio, p_data_fim, p_filiais_ids;

  -- Contar quantidade de notas distintas
  EXECUTE format('
    SELECT COUNT(DISTINCT id_saida)::INTEGER
    FROM %I.faturamento
    WHERE data_saida BETWEEN $1 AND $2
      AND (cancelado IS NULL OR cancelado = '' '' OR cancelado = '''')
      AND ($3 IS NULL OR filial_id = ANY($3))
  ', p_schema)
  INTO v_qtd_notas
  USING p_data_inicio, p_data_fim, p_filiais_ids;

  RETURN QUERY SELECT
    v_receita,
    v_cmv,
    (v_receita - v_cmv)::NUMERIC,
    v_qtd_notas;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_faturamento_data(TEXT, DATE, DATE, INTEGER[])
TO authenticated, service_role;

COMMENT ON FUNCTION public.get_faturamento_data IS
'Retorna totais agregados de faturamento (receita, CMV, lucro bruto) para um período.
CORREÇÃO: Não filtra por transacao. Receita = valor_contabil por nota distinta.
CMV = SUM(quantidade * custo_medio) de todos os itens.';

-- =====================================================
-- FUNÇÃO 2: get_faturamento_por_filial (CORRIGIDA)
-- =====================================================
DROP FUNCTION IF EXISTS public.get_faturamento_por_filial(TEXT, DATE, DATE, INTEGER[]);

CREATE OR REPLACE FUNCTION public.get_faturamento_por_filial(
  p_schema TEXT,
  p_data_inicio DATE,
  p_data_fim DATE,
  p_filiais_ids INTEGER[] DEFAULT NULL
)
RETURNS TABLE (
  filial_id INTEGER,
  receita_faturamento NUMERIC,
  cmv_faturamento NUMERIC,
  lucro_bruto_faturamento NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_table_exists BOOLEAN;
BEGIN
  EXECUTE format('
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = %L AND table_name = ''faturamento''
    )', p_schema) INTO v_table_exists;

  IF NOT v_table_exists THEN
    RETURN;
  END IF;

  -- Receitas por filial: valor_contabil por nota distinta
  -- CMV por filial: SUM(quantidade * custo_medio)
  RETURN QUERY EXECUTE format('
    WITH receitas AS (
      SELECT
        f.filial_id,
        COALESCE(SUM(f.valor_contabil), 0) as receita
      FROM (
        SELECT DISTINCT ON (id_saida) id_saida, filial_id, valor_contabil
        FROM %I.faturamento
        WHERE data_saida BETWEEN $1 AND $2
          AND (cancelado IS NULL OR cancelado = '' '' OR cancelado = '''')
          AND ($3 IS NULL OR filial_id = ANY($3))
      ) f
      GROUP BY f.filial_id
    ),
    custos AS (
      SELECT
        filial_id,
        COALESCE(SUM(quantidade * custo_medio), 0) as cmv
      FROM %I.faturamento
      WHERE data_saida BETWEEN $1 AND $2
        AND (cancelado IS NULL OR cancelado = '' '' OR cancelado = '''')
        AND ($3 IS NULL OR filial_id = ANY($3))
      GROUP BY filial_id
    )
    SELECT
      COALESCE(r.filial_id, c.filial_id)::INTEGER as filial_id,
      COALESCE(r.receita, 0)::NUMERIC as receita_faturamento,
      COALESCE(c.cmv, 0)::NUMERIC as cmv_faturamento,
      (COALESCE(r.receita, 0) - COALESCE(c.cmv, 0))::NUMERIC as lucro_bruto_faturamento
    FROM receitas r
    FULL OUTER JOIN custos c ON r.filial_id = c.filial_id
    ORDER BY filial_id
  ', p_schema, p_schema)
  USING p_data_inicio, p_data_fim, p_filiais_ids;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_faturamento_por_filial(TEXT, DATE, DATE, INTEGER[])
TO authenticated, service_role;

-- =====================================================
-- FUNÇÃO 3: get_dre_comparativo_data (CORRIGIDA)
-- =====================================================
DROP FUNCTION IF EXISTS public.get_dre_comparativo_data(TEXT, INTEGER[], INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.get_dre_comparativo_data(
  p_schema TEXT,
  p_filiais_ids INTEGER[],
  p_mes INTEGER,
  p_ano INTEGER
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
  v_data_inicio DATE;
  v_data_fim DATE;
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

  v_data_inicio := make_date(p_ano, p_mes, 1);
  v_data_fim := (v_data_inicio + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  -- RECEITA BRUTA PDV (vendas_diarias_por_filial)
  EXECUTE format('
    SELECT COALESCE(SUM(valor_total), 0)::NUMERIC
    FROM %I.vendas_diarias_por_filial
    WHERE data_venda BETWEEN $1 AND $2 AND filial_id = ANY($3)
  ', p_schema) INTO v_receita_bruta_pdv USING v_data_inicio, v_data_fim, p_filiais_ids;

  -- CMV PDV
  EXECUTE format('
    SELECT COALESCE(SUM(custo_total), 0)::NUMERIC
    FROM %I.vendas_diarias_por_filial
    WHERE data_venda BETWEEN $1 AND $2 AND filial_id = ANY($3)
  ', p_schema) INTO v_cmv_pdv USING v_data_inicio, v_data_fim, p_filiais_ids;

  -- FATURAMENTO (se tabela existir)
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = %L AND table_name = ''faturamento'')', p_schema) INTO v_table_exists;

  IF v_table_exists THEN
    -- Receita Faturamento: valor_contabil por nota DISTINTA (sem filtro de transacao)
    EXECUTE format('
      SELECT COALESCE(SUM(valor_contabil), 0)::NUMERIC
      FROM (
        SELECT DISTINCT ON (id_saida) id_saida, valor_contabil
        FROM %I.faturamento
        WHERE data_saida BETWEEN $1 AND $2
          AND (cancelado IS NULL OR cancelado = '' '' OR cancelado = '''')
          AND filial_id = ANY($3)
      ) notas_unicas
    ', p_schema) INTO v_receita_bruta_faturamento USING v_data_inicio, v_data_fim, p_filiais_ids;

    -- CMV Faturamento: SUM(quantidade * custo_medio)
    EXECUTE format('
      SELECT COALESCE(SUM(quantidade * custo_medio), 0)::NUMERIC
      FROM %I.faturamento
      WHERE data_saida BETWEEN $1 AND $2
        AND (cancelado IS NULL OR cancelado = '' '' OR cancelado = '''')
        AND filial_id = ANY($3)
    ', p_schema) INTO v_cmv_faturamento USING v_data_inicio, v_data_fim, p_filiais_ids;
  END IF;

  v_receita_bruta := v_receita_bruta_pdv + v_receita_bruta_faturamento;
  v_cmv := v_cmv_pdv + v_cmv_faturamento;

  -- DESCONTO
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = %L AND table_name = ''descontos_venda'')', p_schema) INTO v_table_exists;
  IF v_table_exists THEN
    EXECUTE format('SELECT COALESCE(SUM(valor_desconto), 0)::NUMERIC FROM %I.descontos_venda WHERE data_desconto BETWEEN $1 AND $2 AND filial_id = ANY($3)', p_schema)
    INTO v_desconto_venda USING v_data_inicio, v_data_fim, p_filiais_ids;
  END IF;

  v_receita_liquida := v_receita_bruta - v_desconto_venda;
  v_lucro_bruto := v_receita_liquida - v_cmv;
  IF v_receita_liquida > 0 THEN v_margem_bruta := (v_lucro_bruto / v_receita_liquida) * 100; END IF;

  -- DESPESAS
  EXECUTE format('
    SELECT COALESCE(SUM(desp.valor), 0)::NUMERIC,
      COALESCE(jsonb_agg(jsonb_build_object(''departamento_id'', d.id, ''departamento'', d.descricao, ''valor'', dept_totals.valor_total) ORDER BY dept_totals.valor_total DESC) FILTER (WHERE d.id IS NOT NULL), ''[]''::JSONB)
    FROM %I.despesas desp
    INNER JOIN %I.tipos_despesa td ON desp.id_tipo_despesa = td.id
    INNER JOIN %I.departamentos_nivel1 d ON td.departamentalizacao_nivel1 = d.id
    LEFT JOIN LATERAL (SELECT d2.id, SUM(desp2.valor) as valor_total FROM %I.despesas desp2 INNER JOIN %I.tipos_despesa td2 ON desp2.id_tipo_despesa = td2.id INNER JOIN %I.departamentos_nivel1 d2 ON td2.departamentalizacao_nivel1 = d2.id WHERE desp2.data_despesa BETWEEN $1 AND $2 AND desp2.filial_id = ANY($3) GROUP BY d2.id) dept_totals ON dept_totals.id = d.id
    WHERE desp.data_despesa BETWEEN $1 AND $2 AND desp.filial_id = ANY($3)
  ', p_schema, p_schema, p_schema, p_schema, p_schema, p_schema) INTO v_despesas_operacionais, v_despesas_json USING v_data_inicio, v_data_fim, p_filiais_ids;

  v_despesas_json := (SELECT COALESCE(jsonb_agg(DISTINCT elem), '[]'::JSONB) FROM jsonb_array_elements(v_despesas_json) elem);

  v_resultado_operacional := v_lucro_bruto - v_despesas_operacionais;
  IF v_receita_liquida > 0 THEN v_margem_operacional := (v_resultado_operacional / v_receita_liquida) * 100; END IF;

  RETURN QUERY SELECT v_receita_bruta_pdv, v_receita_bruta_faturamento, v_receita_bruta, v_desconto_venda, v_receita_liquida, v_cmv_pdv, v_cmv_faturamento, v_cmv, v_lucro_bruto, v_margem_bruta, v_despesas_operacionais, v_resultado_operacional, v_margem_operacional, v_despesas_json;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dre_comparativo_data TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dre_comparativo_data TO service_role;

COMMENT ON FUNCTION public.get_dre_comparativo_data IS
'[Module: DRE Comparativo] Returns DRE data for a specific period.
CORREÇÃO: Faturamento não filtra por transacao.
Receita = valor_contabil por nota distinta.
CMV = SUM(quantidade * custo_medio).';
