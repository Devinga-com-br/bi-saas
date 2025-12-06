-- =====================================================
-- Migration: Criar função para gráfico de faturamento por mês
-- Date: 2025-12-06
-- Description: Retorna dados de faturamento agregados por mês para o gráfico
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_faturamento_by_month_chart(
  schema_name TEXT,
  p_filiais TEXT DEFAULT 'all'
)
RETURNS TABLE (
  mes TEXT,
  total_faturamento NUMERIC,
  total_faturamento_ano_anterior NUMERIC,
  total_lucro_faturamento NUMERIC,
  total_lucro_faturamento_ano_anterior NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_filiais_array TEXT[];
  v_table_exists BOOLEAN;
  v_current_year INTEGER;
  v_previous_year INTEGER;
BEGIN
  -- Check if faturamento table exists
  EXECUTE format('
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = %L AND table_name = ''faturamento''
    )', schema_name) INTO v_table_exists;

  IF NOT v_table_exists THEN
    -- Return empty dataset with all months if table doesn't exist
    RETURN QUERY
    SELECT
      m.mes::TEXT,
      0::NUMERIC as total_faturamento,
      0::NUMERIC as total_faturamento_ano_anterior,
      0::NUMERIC as total_lucro_faturamento,
      0::NUMERIC as total_lucro_faturamento_ano_anterior
    FROM (
      SELECT unnest(ARRAY['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']) as mes
    ) m;
    RETURN;
  END IF;

  -- Get current and previous year
  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  v_previous_year := v_current_year - 1;

  -- Parse filiais parameter
  IF p_filiais IS NULL OR p_filiais = 'all' OR p_filiais = '' THEN
    v_filiais_array := NULL;
  ELSE
    v_filiais_array := string_to_array(p_filiais, ',');
  END IF;

  -- Query faturamento data by month
  RETURN QUERY EXECUTE format('
    WITH meses AS (
      SELECT 1 as num, ''Jan'' as nome UNION ALL
      SELECT 2, ''Fev'' UNION ALL
      SELECT 3, ''Mar'' UNION ALL
      SELECT 4, ''Abr'' UNION ALL
      SELECT 5, ''Mai'' UNION ALL
      SELECT 6, ''Jun'' UNION ALL
      SELECT 7, ''Jul'' UNION ALL
      SELECT 8, ''Ago'' UNION ALL
      SELECT 9, ''Set'' UNION ALL
      SELECT 10, ''Out'' UNION ALL
      SELECT 11, ''Nov'' UNION ALL
      SELECT 12, ''Dez''
    ),
    -- Receita: valor_contabil por nota DISTINTA (evita duplicar por produto)
    faturamento_atual AS (
      SELECT
        EXTRACT(MONTH FROM data_saida)::INTEGER as mes_num,
        SUM(valor_contabil) as receita,
        SUM(quantidade * custo_medio) as cmv
      FROM (
        SELECT DISTINCT ON (id_saida, EXTRACT(MONTH FROM data_saida))
          id_saida,
          data_saida,
          valor_contabil,
          quantidade,
          custo_medio
        FROM %I.faturamento
        WHERE EXTRACT(YEAR FROM data_saida) = $1
          AND (cancelado IS NULL OR cancelado = '' '' OR cancelado = '''')
          AND ($2 IS NULL OR filial_id = ANY($2::INTEGER[]))
      ) notas
      GROUP BY EXTRACT(MONTH FROM data_saida)
    ),
    -- CMV precisa ser calculado separadamente (todos os itens, não DISTINCT)
    cmv_atual AS (
      SELECT
        EXTRACT(MONTH FROM data_saida)::INTEGER as mes_num,
        SUM(quantidade * custo_medio) as cmv
      FROM %I.faturamento
      WHERE EXTRACT(YEAR FROM data_saida) = $1
        AND (cancelado IS NULL OR cancelado = '' '' OR cancelado = '''')
        AND ($2 IS NULL OR filial_id = ANY($2::INTEGER[]))
      GROUP BY EXTRACT(MONTH FROM data_saida)
    ),
    receita_atual AS (
      SELECT
        EXTRACT(MONTH FROM data_saida)::INTEGER as mes_num,
        SUM(valor_contabil) as receita
      FROM (
        SELECT DISTINCT ON (id_saida)
          id_saida,
          data_saida,
          valor_contabil
        FROM %I.faturamento
        WHERE EXTRACT(YEAR FROM data_saida) = $1
          AND (cancelado IS NULL OR cancelado = '' '' OR cancelado = '''')
          AND ($2 IS NULL OR filial_id = ANY($2::INTEGER[]))
      ) notas
      GROUP BY EXTRACT(MONTH FROM data_saida)
    ),
    -- Ano anterior
    cmv_anterior AS (
      SELECT
        EXTRACT(MONTH FROM data_saida)::INTEGER as mes_num,
        SUM(quantidade * custo_medio) as cmv
      FROM %I.faturamento
      WHERE EXTRACT(YEAR FROM data_saida) = $3
        AND (cancelado IS NULL OR cancelado = '' '' OR cancelado = '''')
        AND ($2 IS NULL OR filial_id = ANY($2::INTEGER[]))
      GROUP BY EXTRACT(MONTH FROM data_saida)
    ),
    receita_anterior AS (
      SELECT
        EXTRACT(MONTH FROM data_saida)::INTEGER as mes_num,
        SUM(valor_contabil) as receita
      FROM (
        SELECT DISTINCT ON (id_saida)
          id_saida,
          data_saida,
          valor_contabil
        FROM %I.faturamento
        WHERE EXTRACT(YEAR FROM data_saida) = $3
          AND (cancelado IS NULL OR cancelado = '' '' OR cancelado = '''')
          AND ($2 IS NULL OR filial_id = ANY($2::INTEGER[]))
      ) notas
      GROUP BY EXTRACT(MONTH FROM data_saida)
    )
    SELECT
      m.nome::TEXT as mes,
      COALESCE(ra.receita, 0)::NUMERIC as total_faturamento,
      COALESCE(rant.receita, 0)::NUMERIC as total_faturamento_ano_anterior,
      COALESCE(ra.receita - ca.cmv, 0)::NUMERIC as total_lucro_faturamento,
      COALESCE(rant.receita - cant.cmv, 0)::NUMERIC as total_lucro_faturamento_ano_anterior
    FROM meses m
    LEFT JOIN receita_atual ra ON ra.mes_num = m.num
    LEFT JOIN cmv_atual ca ON ca.mes_num = m.num
    LEFT JOIN receita_anterior rant ON rant.mes_num = m.num
    LEFT JOIN cmv_anterior cant ON cant.mes_num = m.num
    ORDER BY m.num
  ', schema_name, schema_name, schema_name, schema_name, schema_name)
  USING v_current_year, v_filiais_array, v_previous_year;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_faturamento_by_month_chart(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_faturamento_by_month_chart(TEXT, TEXT) TO service_role;

-- Comment
COMMENT ON FUNCTION public.get_faturamento_by_month_chart IS
'Returns monthly faturamento data for charts.
- Receita: Sum of valor_contabil per DISTINCT nota (id_saida)
- CMV: Sum of quantidade * custo_medio for all items
- Lucro: Receita - CMV
Returns data for current year and previous year.';
