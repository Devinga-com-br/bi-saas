-- Migration: Create functions for Despesas module
-- Description: Functions to query expenses with hierarchical grouping

-- =============================================
-- Function: get_despesas_por_mes
-- Description: Returns expenses grouped by month for chart
-- =============================================
CREATE OR REPLACE FUNCTION get_despesas_por_mes(
  p_schema TEXT,
  p_filial_id INTEGER,
  p_data_inicial DATE,
  p_data_final DATE,
  p_tipo_data TEXT
)
RETURNS TABLE (
  mes TEXT,
  valor NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sql TEXT;
  v_date_field TEXT;
BEGIN
  -- Validar tipo de data
  IF p_tipo_data = 'data_despesa' THEN
    v_date_field := 'data_despesa';
  ELSIF p_tipo_data = 'data_emissao' THEN
    v_date_field := 'data_emissao';
  ELSIF p_tipo_data = 'data_processamento' THEN
    v_date_field := 'data_processamento';
  ELSE
    v_date_field := 'data_despesa';
  END IF;

  -- Construir query dinâmica
  v_sql := format('
    SELECT
      TO_CHAR(%I, ''YYYY-MM'') as mes,
      COALESCE(SUM(valor), 0)::NUMERIC as valor
    FROM %I.despesas
    WHERE
      %I BETWEEN $1 AND $2
      AND filial_id = $3
    GROUP BY TO_CHAR(%I, ''YYYY-MM'')
    ORDER BY mes
  ', v_date_field, p_schema, v_date_field, v_date_field);

  -- Executar query
  RETURN QUERY EXECUTE v_sql USING p_data_inicial, p_data_final, p_filial_id;
END;
$$;

-- =============================================
-- Function: get_despesas_totalizadores_dept
-- Description: Returns expenses totals grouped by department
-- =============================================
CREATE OR REPLACE FUNCTION get_despesas_totalizadores_dept(
  p_schema TEXT,
  p_filial_id INTEGER,
  p_data_inicial DATE,
  p_data_final DATE,
  p_tipo_data TEXT
)
RETURNS TABLE (
  dept_id INTEGER,
  dept_descricao TEXT,
  qtd_tipos BIGINT,
  qtd_despesas BIGINT,
  valor_total NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sql TEXT;
  v_date_field TEXT;
BEGIN
  -- Validar tipo de data
  IF p_tipo_data = 'data_despesa' THEN
    v_date_field := 'data_despesa';
  ELSIF p_tipo_data = 'data_emissao' THEN
    v_date_field := 'data_emissao';
  ELSIF p_tipo_data = 'data_processamento' THEN
    v_date_field := 'data_processamento';
  ELSE
    v_date_field := 'data_despesa';
  END IF;

  -- Construir query dinâmica
  v_sql := format('
    SELECT
      d.id as dept_id,
      d.descricao as dept_descricao,
      COUNT(DISTINCT td.id) as qtd_tipos,
      COUNT(desp.sequencia) as qtd_despesas,
      COALESCE(SUM(desp.valor), 0)::NUMERIC as valor_total
    FROM %I.despesas desp
    INNER JOIN %I.tipos_despesa td
      ON desp.tipo_despesa_id = td.id
    INNER JOIN %I.departamentos_nivel1 d
      ON td.departamentalizacao_nivel1 = d.id
    WHERE
      desp.%I BETWEEN $1 AND $2
      AND desp.filial_id = $3
    GROUP BY d.id, d.descricao
    ORDER BY valor_total DESC
  ', p_schema, p_schema, p_schema, v_date_field);

  -- Executar query
  RETURN QUERY EXECUTE v_sql USING p_data_inicial, p_data_final, p_filial_id;
END;
$$;

-- =============================================
-- Function: get_despesas_totalizadores_tipo
-- Description: Returns expenses totals grouped by expense type
-- =============================================
CREATE OR REPLACE FUNCTION get_despesas_totalizadores_tipo(
  p_schema TEXT,
  p_filial_id INTEGER,
  p_data_inicial DATE,
  p_data_final DATE,
  p_tipo_data TEXT
)
RETURNS TABLE (
  tipo_id INTEGER,
  tipo_descricao TEXT,
  dept_id INTEGER,
  qtd_despesas BIGINT,
  valor_total NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sql TEXT;
  v_date_field TEXT;
BEGIN
  -- Validar tipo de data
  IF p_tipo_data = 'data_despesa' THEN
    v_date_field := 'data_despesa';
  ELSIF p_tipo_data = 'data_emissao' THEN
    v_date_field := 'data_emissao';
  ELSIF p_tipo_data = 'data_processamento' THEN
    v_date_field := 'data_processamento';
  ELSE
    v_date_field := 'data_despesa';
  END IF;

  -- Construir query dinâmica
  v_sql := format('
    SELECT
      td.id as tipo_id,
      td.descricao as tipo_descricao,
      td.departamentalizacao_nivel1 as dept_id,
      COUNT(desp.sequencia) as qtd_despesas,
      COALESCE(SUM(desp.valor), 0)::NUMERIC as valor_total
    FROM %I.despesas desp
    INNER JOIN %I.tipos_despesa td
      ON desp.tipo_despesa_id = td.id
    WHERE
      desp.%I BETWEEN $1 AND $2
      AND desp.filial_id = $3
    GROUP BY td.id, td.descricao, td.departamentalizacao_nivel1
    ORDER BY valor_total DESC
  ', p_schema, p_schema, v_date_field);

  -- Executar query
  RETURN QUERY EXECUTE v_sql USING p_data_inicial, p_data_final, p_filial_id;
END;
$$;

-- =============================================
-- Function: get_despesas_hierarquia
-- Description: Returns individual expenses with all details
-- =============================================
CREATE OR REPLACE FUNCTION get_despesas_hierarquia(
  p_schema TEXT,
  p_filial_id INTEGER,
  p_data_inicial DATE,
  p_data_final DATE,
  p_tipo_data TEXT
)
RETURNS TABLE (
  dept_id INTEGER,
  tipo_id INTEGER,
  data_despesa DATE,
  descricao_despesa TEXT,
  fornecedor_id TEXT,
  numero_nota BIGINT,
  serie_nota TEXT,
  valor NUMERIC,
  usuario TEXT,
  observacao TEXT,
  data_emissao DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sql TEXT;
  v_date_field TEXT;
BEGIN
  -- Validar tipo de data
  IF p_tipo_data = 'data_despesa' THEN
    v_date_field := 'data_despesa';
  ELSIF p_tipo_data = 'data_emissao' THEN
    v_date_field := 'data_emissao';
  ELSIF p_tipo_data = 'data_processamento' THEN
    v_date_field := 'data_processamento';
  ELSE
    v_date_field := 'data_despesa';
  END IF;

  -- Construir query dinâmica
  v_sql := format('
    SELECT
      d.id as dept_id,
      td.id as tipo_id,
      desp.data_despesa,
      desp.descricao_despesa,
      desp.fornecedor_id,
      desp.numero_nota,
      desp.serie_nota,
      desp.valor,
      desp.usuario,
      desp.observacao,
      desp.data_emissao
    FROM %I.despesas desp
    INNER JOIN %I.tipos_despesa td
      ON desp.tipo_despesa_id = td.id
    INNER JOIN %I.departamentos_nivel1 d
      ON td.departamentalizacao_nivel1 = d.id
    WHERE
      desp.%I BETWEEN $1 AND $2
      AND desp.filial_id = $3
    ORDER BY
      d.descricao,
      td.descricao,
      desp.data_despesa DESC
  ', p_schema, p_schema, p_schema, v_date_field);

  -- Executar query
  RETURN QUERY EXECUTE v_sql USING p_data_inicial, p_data_final, p_filial_id;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_despesas_por_mes TO authenticated;
GRANT EXECUTE ON FUNCTION get_despesas_totalizadores_dept TO authenticated;
GRANT EXECUTE ON FUNCTION get_despesas_totalizadores_tipo TO authenticated;
GRANT EXECUTE ON FUNCTION get_despesas_hierarquia TO authenticated;

-- Comment functions
COMMENT ON FUNCTION get_despesas_por_mes IS 'Returns expenses aggregated by month for chart visualization';
COMMENT ON FUNCTION get_despesas_totalizadores_dept IS 'Returns expenses totals grouped by department level 1';
COMMENT ON FUNCTION get_despesas_totalizadores_tipo IS 'Returns expenses totals grouped by expense type';
COMMENT ON FUNCTION get_despesas_hierarquia IS 'Returns individual expenses with full details for hierarchical display';
