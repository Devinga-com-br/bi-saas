-- =====================================================
-- INSTRUÇÕES PARA EXECUTAR MANUALMENTE NO SUPABASE
-- =====================================================
-- 
-- 1. Acesse o Supabase SQL Editor
-- 2. Cole todo o conteúdo deste arquivo
-- 3. Execute
-- 4. Teste com o comando no final
--
-- =====================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS get_venda_curva_report(TEXT, INTEGER, INTEGER, BIGINT, INTEGER, INTEGER);

-- Create return type for the function
DROP TYPE IF EXISTS venda_curva_result CASCADE;

-- Create main function
CREATE OR REPLACE FUNCTION get_venda_curva_report(
  p_schema TEXT,
  p_mes INTEGER,
  p_ano INTEGER,
  p_filial_id BIGINT DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 50
)
RETURNS TABLE (
  tipo TEXT,
  nome TEXT,
  segmento_pai TEXT,
  codigo_produto BIGINT,
  quantidade_vendida NUMERIC,
  valor_vendido NUMERIC,
  lucro_total NUMERIC,
  percentual_lucro NUMERIC,
  curva_erp TEXT,
  curva_calculada TEXT,
  curva_lucro TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_query TEXT;
BEGIN
  -- Build dynamic query
  v_query := format('
    WITH vendas_produtos AS (
      -- Get base sales data with all department levels
      SELECT 
        p.id as produto_codigo,
        p.descricao as produto_descricao,
        d1.descricao as dept_nivel1,
        COALESCE(d2.descricao, ''Sem Nível 2'') as dept_nivel2,
        COALESCE(d3.descricao, ''Sem Nível 3'') as dept_nivel3,
        SUM(v.quantidade) as quantidade,
        SUM(v.valor_vendas) as total_vendas,
        SUM(COALESCE(v.valor_vendas, 0) - (COALESCE(v.custo_compra, 0) * COALESCE(v.quantidade, 0))) as lucro,
        COALESCE(p.curva_abcd, ''D'') as curva_venda,
        COALESCE(p.curva_lucro, ''D'') as curva_lucro
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
        p.id, p.descricao,
        d1.descricao,
        d2.descricao,
        d3.descricao,
        p.curva_abcd, p.curva_lucro
    ),
    -- Level 3 (highest level) aggregation
    nivel_3 AS (
      SELECT 
        ''nivel_3''::TEXT as tipo,
        dept_nivel3 as nome,
        NULL::TEXT as segmento_pai,
        NULL::BIGINT as codigo_produto,
        NULL::NUMERIC as quantidade_vendida,
        SUM(total_vendas) as valor_vendido,
        SUM(lucro) as lucro_total,
        CASE 
          WHEN SUM(total_vendas) > 0 
          THEN ROUND((SUM(lucro) / SUM(total_vendas)) * 100, 2)
          ELSE 0 
        END as percentual_lucro,
        NULL::TEXT as curva_erp,
        NULL::TEXT as curva_calculada,
        NULL::TEXT as curva_lucro
      FROM vendas_produtos
      GROUP BY dept_nivel3
    ),
    -- Level 2 aggregation
    nivel_2 AS (
      SELECT 
        ''nivel_2''::TEXT as tipo,
        dept_nivel2 as nome,
        dept_nivel3 as segmento_pai,
        NULL::BIGINT as codigo_produto,
        NULL::NUMERIC as quantidade_vendida,
        SUM(total_vendas) as valor_vendido,
        SUM(lucro) as lucro_total,
        CASE 
          WHEN SUM(total_vendas) > 0 
          THEN ROUND((SUM(lucro) / SUM(total_vendas)) * 100, 2)
          ELSE 0 
        END as percentual_lucro,
        NULL::TEXT as curva_erp,
        NULL::TEXT as curva_calculada,
        NULL::TEXT as curva_lucro
      FROM vendas_produtos
      GROUP BY dept_nivel3, dept_nivel2
    ),
    -- Level 1 aggregation
    nivel_1 AS (
      SELECT 
        ''nivel_1''::TEXT as tipo,
        dept_nivel1 as nome,
        dept_nivel2 as segmento_pai,
        NULL::BIGINT as codigo_produto,
        NULL::NUMERIC as quantidade_vendida,
        SUM(total_vendas) as valor_vendido,
        SUM(lucro) as lucro_total,
        CASE 
          WHEN SUM(total_vendas) > 0 
          THEN ROUND((SUM(lucro) / SUM(total_vendas)) * 100, 2)
          ELSE 0 
        END as percentual_lucro,
        NULL::TEXT as curva_erp,
        NULL::TEXT as curva_calculada,
        NULL::TEXT as curva_lucro
      FROM vendas_produtos
      GROUP BY dept_nivel3, dept_nivel2, dept_nivel1
    ),
    -- Products
    produtos AS (
      SELECT 
        ''produto''::TEXT as tipo,
        produto_descricao as nome,
        dept_nivel1 as segmento_pai,
        produto_codigo as codigo_produto,
        ROUND(quantidade::NUMERIC, 2) as quantidade_vendida,
        ROUND(total_vendas::NUMERIC, 2) as valor_vendido,
        ROUND(lucro::NUMERIC, 2) as lucro_total,
        CASE 
          WHEN total_vendas > 0 
          THEN ROUND((lucro / total_vendas) * 100, 2)
          ELSE 0 
        END as percentual_lucro,
        curva_venda as curva_erp,
        curva_venda as curva_calculada,
        curva_lucro as curva_lucro
      FROM vendas_produtos
    ),
    -- Union all levels
    todos_niveis AS (
      SELECT * FROM nivel_3
      UNION ALL
      SELECT * FROM nivel_2
      UNION ALL
      SELECT * FROM nivel_1
      UNION ALL
      SELECT * FROM produtos
    )
    SELECT 
      tipo,
      nome,
      segmento_pai,
      codigo_produto,
      quantidade_vendida,
      valor_vendido,
      lucro_total,
      percentual_lucro,
      curva_erp,
      curva_calculada,
      curva_lucro
    FROM todos_niveis
    ORDER BY 
      CASE tipo
        WHEN ''nivel_3'' THEN 1
        WHEN ''nivel_2'' THEN 2
        WHEN ''nivel_1'' THEN 3
        WHEN ''produto'' THEN 4
      END,
      valor_vendido DESC NULLS LAST
  ', p_schema, p_schema, p_schema, p_schema, p_schema, 
     p_mes, p_ano, p_filial_id, p_filial_id);

  -- Execute and return results
  RETURN QUERY EXECUTE v_query;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao gerar relatório de venda por curva: %', SQLERRM;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_venda_curva_report(TEXT, INTEGER, INTEGER, BIGINT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_venda_curva_report(TEXT, INTEGER, INTEGER, BIGINT, INTEGER, INTEGER) TO service_role;

-- Add comment
COMMENT ON FUNCTION get_venda_curva_report IS 'Returns hierarchical sales data grouped by department levels (Python style structure)';

-- =====================================================
-- TESTE A FUNÇÃO COM ESTE COMANDO:
-- =====================================================
-- 
-- SELECT * FROM get_venda_curva_report('okilao', 9, 2025, 1, 1, 10);
-- 
-- Substitua os parâmetros:
-- 'okilao' = seu schema
-- 9 = mês (setembro)
-- 2025 = ano
-- 1 = filial_id (ou NULL para todas)
-- 1 = página
-- 10 = registros por página
--
-- =====================================================
