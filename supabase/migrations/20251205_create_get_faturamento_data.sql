-- Migration: Criar funções para buscar dados de faturamento
-- Data: 2025-12-05
-- Descrição: Funções RPC para integrar vendas de faturamento ao DRE Gerencial

-- =====================================================
-- FUNÇÃO 1: get_faturamento_data
-- Retorna totais agregados de faturamento para um período
-- =====================================================

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

  -- Se tabela não existe, retornar zeros
  IF NOT v_table_exists THEN
    RETURN QUERY SELECT 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::INTEGER;
    RETURN;
  END IF;

  -- Calcular Receita (valor_contabil é por nota, não por produto)
  -- Usar DISTINCT ON (id_saida) para pegar o valor da nota apenas uma vez
  EXECUTE format('
    SELECT COALESCE(SUM(valor_contabil), 0)::NUMERIC
    FROM (
      SELECT DISTINCT ON (id_saida) id_saida, valor_contabil
      FROM %I.faturamento
      WHERE data_saida BETWEEN $1 AND $2
        AND transacao = ''V''
        AND (cancelado IS NULL OR cancelado = '' '' OR cancelado = '''')
        AND ($3 IS NULL OR filial_id = ANY($3))
    ) notas_unicas
  ', p_schema)
  INTO v_receita
  USING p_data_inicio, p_data_fim, p_filiais_ids;

  -- Calcular CMV (custo_sem_icms é por produto, somar todos)
  EXECUTE format('
    SELECT COALESCE(SUM(custo_sem_icms), 0)::NUMERIC
    FROM %I.faturamento
    WHERE data_saida BETWEEN $1 AND $2
      AND transacao = ''V''
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
      AND transacao = ''V''
      AND (cancelado IS NULL OR cancelado = '' '' OR cancelado = '''')
      AND ($3 IS NULL OR filial_id = ANY($3))
  ', p_schema)
  INTO v_qtd_notas
  USING p_data_inicio, p_data_fim, p_filiais_ids;

  -- Retornar resultados
  RETURN QUERY SELECT
    v_receita,
    v_cmv,
    (v_receita - v_cmv)::NUMERIC,
    v_qtd_notas;
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION public.get_faturamento_data(TEXT, DATE, DATE, INTEGER[])
TO authenticated, service_role;

COMMENT ON FUNCTION public.get_faturamento_data IS
'Retorna totais agregados de faturamento (receita, CMV, lucro bruto) para um período.
CRÍTICO: valor_contabil é o valor total da nota, repetido em cada linha de produto.
Por isso usamos DISTINCT ON (id_saida) para calcular a receita corretamente.';


-- =====================================================
-- FUNÇÃO 2: get_faturamento_por_filial
-- Retorna dados de faturamento agrupados por filial
-- =====================================================

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
  -- Verificar se tabela faturamento existe no schema
  EXECUTE format('
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = %L AND table_name = ''faturamento''
    )', p_schema) INTO v_table_exists;

  -- Se tabela não existe, retornar vazio
  IF NOT v_table_exists THEN
    RETURN;
  END IF;

  -- Retornar dados agregados por filial
  -- CTE para receitas: agrupa por filial, usando DISTINCT ON para evitar duplicar valor_contabil
  -- CTE para custos: agrupa por filial, somando custo_sem_icms de todos os produtos
  RETURN QUERY EXECUTE format('
    WITH receitas AS (
      SELECT
        f.filial_id,
        COALESCE(SUM(f.valor_contabil), 0) as receita
      FROM (
        SELECT DISTINCT ON (id_saida, filial_id)
          id_saida, filial_id, valor_contabil
        FROM %I.faturamento
        WHERE data_saida BETWEEN $1 AND $2
          AND transacao = ''V''
          AND (cancelado IS NULL OR cancelado = '' '' OR cancelado = '''')
          AND ($3 IS NULL OR filial_id = ANY($3))
      ) f
      GROUP BY f.filial_id
    ),
    custos AS (
      SELECT
        filial_id,
        COALESCE(SUM(custo_sem_icms), 0) as cmv
      FROM %I.faturamento
      WHERE data_saida BETWEEN $1 AND $2
        AND transacao = ''V''
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

-- Permissões
GRANT EXECUTE ON FUNCTION public.get_faturamento_por_filial(TEXT, DATE, DATE, INTEGER[])
TO authenticated, service_role;

COMMENT ON FUNCTION public.get_faturamento_por_filial IS
'Retorna dados de faturamento (receita, CMV, lucro bruto) agrupados por filial.
Usado para exibir valores detalhados por filial na tabela do DRE.';
