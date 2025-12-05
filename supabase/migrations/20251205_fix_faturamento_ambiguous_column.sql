-- =====================================================
-- CORREÇÃO: Coluna filial_id ambígua em get_faturamento_por_filial
-- Date: 2025-12-05
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
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = %L AND table_name = ''faturamento'')', p_schema) INTO v_table_exists;

  IF NOT v_table_exists THEN
    RETURN;
  END IF;

  -- Corrigido: usar alias explícito para evitar ambiguidade
  RETURN QUERY EXECUTE format('
    WITH notas_unicas AS (
      SELECT DISTINCT ON (id_saida)
        id_saida,
        filial_id as nota_filial_id,
        valor_contabil
      FROM %I.faturamento
      WHERE data_saida BETWEEN $1 AND $2
        AND (cancelado IS NULL OR cancelado = '' '' OR cancelado = '''')
        AND ($3 IS NULL OR filial_id = ANY($3))
    ),
    receitas AS (
      SELECT
        nota_filial_id as fil_id,
        COALESCE(SUM(valor_contabil), 0) as receita
      FROM notas_unicas
      GROUP BY nota_filial_id
    ),
    custos AS (
      SELECT
        filial_id as fil_id,
        COALESCE(SUM(quantidade * custo_medio), 0) as cmv
      FROM %I.faturamento
      WHERE data_saida BETWEEN $1 AND $2
        AND (cancelado IS NULL OR cancelado = '' '' OR cancelado = '''')
        AND ($3 IS NULL OR filial_id = ANY($3))
      GROUP BY filial_id
    )
    SELECT
      COALESCE(r.fil_id, c.fil_id)::INTEGER as filial_id,
      COALESCE(r.receita, 0)::NUMERIC as receita_faturamento,
      COALESCE(c.cmv, 0)::NUMERIC as cmv_faturamento,
      (COALESCE(r.receita, 0) - COALESCE(c.cmv, 0))::NUMERIC as lucro_bruto_faturamento
    FROM receitas r
    FULL OUTER JOIN custos c ON r.fil_id = c.fil_id
    ORDER BY 1
  ', p_schema, p_schema) USING p_data_inicio, p_data_fim, p_filiais_ids;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_faturamento_por_filial(TEXT, DATE, DATE, INTEGER[]) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_faturamento_por_filial IS
'Retorna dados de faturamento por filial. CORREÇÃO: Alias explícito para evitar ambiguidade de filial_id.';
