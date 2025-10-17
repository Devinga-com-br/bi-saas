-- Drop existing function
DROP FUNCTION IF EXISTS get_venda_curva_report(TEXT, INTEGER, INTEGER, BIGINT, INTEGER, INTEGER);

-- Create simple flat report function that returns products with department hierarchy
CREATE OR REPLACE FUNCTION get_venda_curva_report(
  p_schema TEXT,
  p_mes INTEGER,
  p_ano INTEGER,
  p_filial_id BIGINT DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 50
)
RETURNS TABLE(
  dept_nivel3 TEXT,
  dept_nivel2 TEXT,
  dept_nivel1 TEXT,
  produto_codigo BIGINT,
  produto_descricao TEXT,
  filial_id BIGINT,
  qtde NUMERIC,
  valor_vendas NUMERIC,
  lucro NUMERIC,
  percentual_lucro NUMERIC,
  curva_venda TEXT,
  curva_lucro TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_query TEXT;
  v_offset INTEGER;
BEGIN
  -- Calculate offset for pagination
  v_offset := (p_page - 1) * p_page_size;
  
  -- Build dynamic query
  v_query := format($query$
    SELECT 
      COALESCE(d3.descricao, 'Sem Nível 3') as dept_nivel3,
      COALESCE(d2.descricao, 'Sem Nível 2') as dept_nivel2,
      d1.descricao as dept_nivel1,
      p.id as produto_codigo,
      p.descricao as produto_descricao,
      v.filial_id,
      ROUND(SUM(v.quantidade)::numeric, 2) as qtde,
      ROUND(SUM(v.valor_vendas)::numeric, 2) as valor_vendas,
      ROUND(SUM(COALESCE(v.valor_vendas, 0) - (COALESCE(v.custo_compra, 0) * COALESCE(v.quantidade, 0)))::numeric, 2) as lucro,
      CASE 
        WHEN SUM(v.valor_vendas) > 0 
        THEN ROUND((SUM(COALESCE(v.valor_vendas, 0) - (COALESCE(v.custo_compra, 0) * COALESCE(v.quantidade, 0))) / SUM(v.valor_vendas)) * 100, 2)
        ELSE 0 
      END as percentual_lucro,
      COALESCE(p.curva_abcd, 'D') as curva_venda,
      COALESCE(p.curva_lucro, 'D') as curva_lucro
    FROM %I.vendas v
    INNER JOIN %I.produtos p ON p.id = v.id_produto AND p.filial_id = v.filial_id
    INNER JOIN %I.departments_level_1 d1 ON d1.departamento_id = p.departamento_id
    LEFT JOIN %I.departments_level_2 d2 ON d2.departamento_id = d1.pai_level_2_id
    LEFT JOIN %I.departments_level_3 d3 ON d3.departamento_id = d1.pai_level_3_id
    WHERE EXTRACT(MONTH FROM v.data_venda) = %L
      AND EXTRACT(YEAR FROM v.data_venda) = %L
      AND v.valor_vendas > 0
      AND p.ativo = true
      AND (%L IS NULL OR v.filial_id = %L)
    GROUP BY 
      d3.descricao, d3.departamento_id,
      d2.descricao, d2.departamento_id,
      d1.descricao, d1.departamento_id,
      p.id, p.descricao,
      v.filial_id, p.curva_abcd, p.curva_lucro
    ORDER BY 
      COALESCE(d3.descricao, 'Sem Nível 3'),
      COALESCE(d2.descricao, 'Sem Nível 2'),
      d1.descricao,
      CASE COALESCE(p.curva_abcd, 'D')
        WHEN 'A' THEN 1 
        WHEN 'C' THEN 2 
        WHEN 'B' THEN 3 
        WHEN 'D' THEN 4 
        ELSE 5 
      END,
      SUM(v.valor_vendas) DESC
    LIMIT %L OFFSET %L
  $query$, 
    p_schema, p_schema, p_schema, p_schema, p_schema,
    p_mes, p_ano, p_filial_id, p_filial_id,
    p_page_size, v_offset
  );
  
  -- Execute and return
  RETURN QUERY EXECUTE v_query;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao gerar relatório de venda por curva: %', SQLERRM;
    RAISE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_venda_curva_report(TEXT, INTEGER, INTEGER, BIGINT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_venda_curva_report(TEXT, INTEGER, INTEGER, BIGINT, INTEGER, INTEGER) TO service_role;

COMMENT ON FUNCTION get_venda_curva_report IS 'Retorna relatório de venda por curva com hierarquia de departamentos (flat structure)';
