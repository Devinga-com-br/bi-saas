-- Migration: Fix Despesas functions with correct column names
-- Description: Update functions to use id_tipo_despesa and id_fornecedor

-- Drop old functions if they exist
DROP FUNCTION IF EXISTS get_despesas_hierarquia;

-- =============================================
-- Function: get_despesas_hierarquia
-- Description: Returns all expenses with department and type information
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
  dept_descricao TEXT,
  tipo_id INTEGER,
  tipo_descricao TEXT,
  data_emissao DATE,
  descricao_despesa TEXT,
  id_fornecedor INTEGER,
  numero_nota BIGINT,
  serie_nota CHARACTER VARYING,
  valor NUMERIC,
  usuario CHARACTER VARYING,
  observacao TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sql TEXT;
BEGIN
  -- Construir query dinâmica com nomes corretos de colunas
  v_sql := format('
    SELECT
      d.id as dept_id,
      d.descricao as dept_descricao,
      td.id as tipo_id,
      td.descricao as tipo_descricao,
      desp.data_emissao,
      desp.descricao_despesa,
      desp.id_fornecedor,
      desp.numero_nota,
      desp.serie_nota,
      desp.valor,
      desp.usuario,
      desp.observacao
    FROM %I.despesas desp
    INNER JOIN %I.tipos_despesa td
      ON desp.id_tipo_despesa = td.id
    INNER JOIN %I.departamentos_nivel1 d
      ON td.departamentalizacao_nivel1 = d.id
    WHERE desp.data_emissao BETWEEN $1 AND $2
      AND desp.filial_id = $3
    ORDER BY d.descricao, td.descricao, desp.data_emissao DESC
    LIMIT 1000
  ', p_schema, p_schema, p_schema);

  -- Executar query
  RETURN QUERY EXECUTE v_sql USING p_data_inicial, p_data_final, p_filial_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_despesas_hierarquia TO authenticated;
GRANT EXECUTE ON FUNCTION get_despesas_hierarquia TO anon;

-- Comment function
COMMENT ON FUNCTION get_despesas_hierarquia IS 'Returns expenses with full department and type hierarchy for display';
