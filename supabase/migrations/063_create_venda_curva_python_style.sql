-- Drop existing function
DROP FUNCTION IF EXISTS get_venda_curva_report(text, integer, integer, bigint, integer, integer);

-- Create function that returns flat data similar to Python version
CREATE OR REPLACE FUNCTION get_venda_curva_report(
  p_schema text,
  p_mes integer,
  p_ano integer,
  p_filial_id bigint DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 50
)
RETURNS TABLE (
  tipo text,
  nome text,
  segmento_pai text,
  codigo_produto bigint,
  quantidade_vendida numeric,
  valor_vendido numeric,
  lucro_total numeric,
  percentual_lucro numeric,
  curva_erp text,
  curva_calculada text,
  curva_lucro text,
  filial_id bigint
) 
LANGUAGE plpgsql
AS $$
DECLARE
  v_query text;
BEGIN
  -- Build dynamic query
  v_query := format('
    -- Nível 3 (mais alto)
    WITH vendas_base AS (
      SELECT 
        v.filial_id,
        p.id as produto_codigo,
        p.descricao as produto_descricao,
        d1.descricao as dept_nivel1,
        d1.departamento_id as dept1_id,
        COALESCE(d2.descricao, ''Sem Nível 2'') as dept_nivel2,
        COALESCE(d2.departamento_id, 0) as dept2_id,
        COALESCE(d3.descricao, ''Sem Nível 3'') as dept_nivel3,
        COALESCE(d3.departamento_id, 0) as dept3_id,
        v.quantidade,
        v.valor_vendas,
        COALESCE(v.valor_vendas, 0) - (COALESCE(v.custo_compra, 0) * COALESCE(v.quantidade, 0)) as lucro,
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
    ),
    -- Nível 3 agregado
    nivel3_agg AS (
      SELECT 
        dept_nivel3 as nome,
        NULL::text as segmento_pai,
        SUM(valor_vendas) as valor_vendido,
        SUM(lucro) as lucro_total,
        CASE 
          WHEN SUM(valor_vendas) > 0 
          THEN ROUND((SUM(lucro) / SUM(valor_vendas)) * 100, 2)
          ELSE 0 
        END as percentual_lucro
      FROM vendas_base
      GROUP BY dept_nivel3
    ),
    -- Nível 2 agregado
    nivel2_agg AS (
      SELECT 
        dept_nivel2 as nome,
        dept_nivel3 as segmento_pai,
        SUM(valor_vendas) as valor_vendido,
        SUM(lucro) as lucro_total,
        CASE 
          WHEN SUM(valor_vendas) > 0 
          THEN ROUND((SUM(lucro) / SUM(valor_vendas)) * 100, 2)
          ELSE 0 
        END as percentual_lucro
      FROM vendas_base
      GROUP BY dept_nivel3, dept_nivel2
    ),
    -- Nível 1 agregado
    nivel1_agg AS (
      SELECT 
        dept_nivel1 as nome,
        dept_nivel2 as segmento_pai,
        SUM(valor_vendas) as valor_vendido,
        SUM(lucro) as lucro_total,
        CASE 
          WHEN SUM(valor_vendas) > 0 
          THEN ROUND((SUM(lucro) / SUM(valor_vendas)) * 100, 2)
          ELSE 0 
        END as percentual_lucro
      FROM vendas_base
      GROUP BY dept_nivel2, dept_nivel1
    ),
    -- Produtos
    produtos_agg AS (
      SELECT 
        produto_descricao as nome,
        dept_nivel1 as segmento_pai,
        produto_codigo,
        filial_id,
        SUM(quantidade) as quantidade_vendida,
        SUM(valor_vendas) as valor_vendido,
        SUM(lucro) as lucro_total,
        CASE 
          WHEN SUM(valor_vendas) > 0 
          THEN ROUND((SUM(lucro) / SUM(valor_vendas)) * 100, 2)
          ELSE 0 
        END as percentual_lucro,
        curva_venda,
        curva_lucro
      FROM vendas_base
      GROUP BY produto_codigo, produto_descricao, dept_nivel1, filial_id, curva_venda, curva_lucro
    )
    -- Union de todos os níveis
    SELECT ''nivel_3''::text as tipo, nome, segmento_pai, NULL::bigint as codigo_produto, 
           NULL::numeric as quantidade_vendida, valor_vendido, lucro_total, percentual_lucro,
           NULL::text as curva_erp, NULL::text as curva_calculada, NULL::text as curva_lucro,
           NULL::bigint as filial_id
    FROM nivel3_agg
    UNION ALL
    SELECT ''nivel_2''::text, nome, segmento_pai, NULL::bigint, 
           NULL::numeric, valor_vendido, lucro_total, percentual_lucro,
           NULL::text, NULL::text, NULL::text, NULL::bigint
    FROM nivel2_agg
    UNION ALL
    SELECT ''nivel_1''::text, nome, segmento_pai, NULL::bigint, 
           NULL::numeric, valor_vendido, lucro_total, percentual_lucro,
           NULL::text, NULL::text, NULL::text, NULL::bigint
    FROM nivel1_agg
    UNION ALL
    SELECT ''produto''::text, nome, segmento_pai, codigo_produto, 
           quantidade_vendida, valor_vendido, lucro_total, percentual_lucro,
           curva_venda, curva_venda, curva_lucro, filial_id
    FROM produtos_agg
    ORDER BY 
      CASE tipo 
        WHEN ''nivel_3'' THEN 1
        WHEN ''nivel_2'' THEN 2
        WHEN ''nivel_1'' THEN 3
        WHEN ''produto'' THEN 4
      END,
      valor_vendido DESC NULLS LAST
  ', p_schema, p_schema, p_schema, p_schema, p_schema, p_mes, p_ano, p_filial_id, p_filial_id);

  -- Return query results
  RETURN QUERY EXECUTE v_query;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao gerar relatório de venda por curva: %', SQLERRM;
END;
$$;
