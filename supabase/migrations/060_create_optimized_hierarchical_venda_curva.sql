-- Drop existing function
DROP FUNCTION IF EXISTS get_venda_curva_report(TEXT, INTEGER, INTEGER, BIGINT, INTEGER, INTEGER);

-- Create optimized hierarchical venda curva report
CREATE OR REPLACE FUNCTION get_venda_curva_report(
  p_schema TEXT,
  p_mes INTEGER,
  p_ano INTEGER,
  p_filial_id BIGINT DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offset INTEGER;
  v_result JSONB;
  v_query TEXT;
BEGIN
  -- Calculate offset
  v_offset := (p_page - 1) * p_page_size;
  
  -- Build dynamic query
  v_query := format($query$
    WITH vendas_base AS (
      SELECT 
        v.filial_id,
        p.id as produto_codigo,
        p.descricao as produto_descricao,
        p.departamento_id,
        d1.descricao as dept_nivel1,
        d1.departamento_id as dept1_id,
        d1.pai_level_2_id,
        COALESCE(d2.descricao, 'Sem Nível 2') as dept_nivel2,
        COALESCE(d2.departamento_id, 0) as dept2_id,
        d1.pai_level_3_id,
        COALESCE(d3.descricao, 'Sem Nível 3') as dept_nivel3,
        COALESCE(d3.departamento_id, 0) as dept3_id,
        v.quantidade,
        v.valor_vendas,
        COALESCE(v.valor_vendas, 0) - (COALESCE(v.custo_compra, 0) * COALESCE(v.quantidade, 0)) as lucro,
        COALESCE(p.curva_abcd, 'D') as curva_venda,
        COALESCE(p.curva_lucro, 'D') as curva_lucro
      FROM %I.vendas v
      INNER JOIN %I.produtos p ON p.id = v.id_produto AND p.filial_id = v.filial_id
      INNER JOIN %I.departments_level_1 d1 ON d1.departamento_id = p.departamento_id
      LEFT JOIN %I.departments_level_2 d2 ON d2.departamento_id = d1.pai_level_2_id
      LEFT JOIN %I.departments_level_3 d3 ON d3.departamento_id = d1.pai_level_3_id
      WHERE EXTRACT(MONTH FROM v.data_venda) = $1
        AND EXTRACT(YEAR FROM v.data_venda) = $2
        AND v.valor_vendas > 0
        AND p.ativo = true
        AND ($3 IS NULL OR v.filial_id = $3)
    ),
    produtos_agrupados AS (
      SELECT 
        dept3_id,
        dept_nivel3,
        dept2_id,
        dept_nivel2,
        dept1_id,
        dept_nivel1,
        produto_codigo,
        produto_descricao,
        filial_id,
        SUM(quantidade) as qtde,
        SUM(valor_vendas) as valor_vendas,
        SUM(lucro) as valor_lucro,
        curva_venda,
        curva_lucro,
        CASE 
          WHEN SUM(valor_vendas) > 0 
          THEN ROUND((SUM(lucro) / SUM(valor_vendas)) * 100, 2)
          ELSE 0 
        END as percentual_lucro
      FROM vendas_base
      GROUP BY 
        dept3_id, dept_nivel3,
        dept2_id, dept_nivel2,
        dept1_id, dept_nivel1,
        produto_codigo, produto_descricao,
        filial_id, curva_venda, curva_lucro
    ),
    dept1_totais AS (
      SELECT 
        dept3_id,
        dept_nivel3,
        dept2_id,
        dept_nivel2,
        dept1_id,
        dept_nivel1,
        SUM(valor_vendas) as total_vendas,
        SUM(valor_lucro) as total_lucro,
        CASE 
          WHEN SUM(valor_vendas) > 0 
          THEN ROUND((SUM(valor_lucro) / SUM(valor_vendas)) * 100, 2)
          ELSE 0 
        END as margem
      FROM produtos_agrupados
      GROUP BY dept3_id, dept_nivel3, dept2_id, dept_nivel2, dept1_id, dept_nivel1
    ),
    dept2_totais AS (
      SELECT 
        dept3_id,
        dept_nivel3,
        dept2_id,
        dept_nivel2,
        SUM(total_vendas) as total_vendas,
        SUM(total_lucro) as total_lucro,
        CASE 
          WHEN SUM(total_vendas) > 0 
          THEN ROUND((SUM(total_lucro) / SUM(total_vendas)) * 100, 2)
          ELSE 0 
        END as margem
      FROM dept1_totais
      GROUP BY dept3_id, dept_nivel3, dept2_id, dept_nivel2
    ),
    dept3_totais AS (
      SELECT 
        dept3_id,
        dept_nivel3,
        SUM(total_vendas) as total_vendas,
        SUM(total_lucro) as total_lucro,
        CASE 
          WHEN SUM(total_vendas) > 0 
          THEN ROUND((SUM(total_lucro) / SUM(total_vendas)) * 100, 2)
          ELSE 0 
        END as margem,
        ROW_NUMBER() OVER (ORDER BY SUM(total_vendas) DESC) as rn,
        COUNT(*) OVER () as total_count
      FROM dept2_totais
      GROUP BY dept3_id, dept_nivel3
    ),
    dept3_paginado AS (
      SELECT *
      FROM dept3_totais
      WHERE rn > $4 AND rn <= $4 + $5
    ),
    hierarquia_construida AS (
      SELECT 
        d3.dept3_id,
        d3.dept_nivel3,
        d3.margem,
        d3.total_vendas as dept3_valor_vendas,
        d3.total_lucro as dept3_valor_lucro,
        d3.rn,
        d3.total_count,
        d2.dept2_id,
        d2.dept_nivel2,
        d2.margem as dept2_margem,
        d2.total_vendas as dept2_valor_vendas,
        d1.dept1_id,
        d1.dept_nivel1,
        d1.margem as dept1_margem,
        d1.total_vendas as dept1_valor_vendas
      FROM dept3_paginado d3
      INNER JOIN dept2_totais d2 ON d2.dept3_id = d3.dept3_id
      INNER JOIN dept1_totais d1 ON d1.dept2_id = d2.dept2_id AND d1.dept3_id = d2.dept3_id
    ),
    produtos_completos AS (
      SELECT 
        h.dept3_id,
        h.dept2_id,
        h.dept1_id,
        jsonb_agg(
          jsonb_build_object(
            'codigo', p.produto_codigo,
            'descricao', p.produto_descricao,
            'filial_id', p.filial_id,
            'qtde', ROUND(p.qtde::numeric, 2),
            'valor_vendas', ROUND(p.valor_vendas::numeric, 2),
            'curva_venda', p.curva_venda,
            'valor_lucro', ROUND(p.valor_lucro::numeric, 2),
            'percentual_lucro', p.percentual_lucro,
            'curva_lucro', p.curva_lucro
          )
          ORDER BY 
            CASE p.curva_venda 
              WHEN 'A' THEN 1 
              WHEN 'C' THEN 2 
              WHEN 'B' THEN 3 
              WHEN 'D' THEN 4 
              ELSE 5 
            END,
            p.valor_vendas DESC
        ) as produtos
      FROM hierarquia_construida h
      INNER JOIN produtos_agrupados p 
        ON p.dept1_id = h.dept1_id 
        AND p.dept2_id = h.dept2_id 
        AND p.dept3_id = h.dept3_id
      GROUP BY h.dept3_id, h.dept2_id, h.dept1_id
    ),
    dept1_completo AS (
      SELECT 
        h.dept3_id,
        h.dept2_id,
        h.dept2_valor_vendas,
        jsonb_agg(
          jsonb_build_object(
            'nome_departamento', h.dept_nivel1,
            'dept1_id', h.dept1_id,
            'margem', h.dept1_margem,
            'produtos', COALESCE(pc.produtos, '[]'::jsonb)
          )
          ORDER BY h.dept1_valor_vendas DESC
        ) as nivel1
      FROM (
        SELECT DISTINCT ON (dept3_id, dept2_id, dept1_id)
          dept3_id, dept2_id, dept1_id, dept_nivel1, dept1_margem, dept1_valor_vendas, dept2_valor_vendas
        FROM hierarquia_construida
      ) h
      LEFT JOIN produtos_completos pc 
        ON pc.dept1_id = h.dept1_id 
        AND pc.dept2_id = h.dept2_id 
        AND pc.dept3_id = h.dept3_id
      GROUP BY h.dept3_id, h.dept2_id, h.dept2_valor_vendas
    ),
    dept2_completo AS (
      SELECT 
        h.dept3_id,
        jsonb_agg(
          jsonb_build_object(
            'nome_departamento', h.dept_nivel2,
            'margem', h.dept2_margem,
            'nivel1', d1c.nivel1
          )
          ORDER BY d1c.dept2_valor_vendas DESC
        ) as nivel2
      FROM (
        SELECT DISTINCT dept3_id, dept2_id, dept_nivel2, dept2_margem, dept2_valor_vendas
        FROM hierarquia_construida
      ) h
      INNER JOIN dept1_completo d1c 
        ON d1c.dept3_id = h.dept3_id 
        AND d1c.dept2_id = h.dept2_id
      GROUP BY h.dept3_id
    )
    SELECT jsonb_build_object(
      'page', $6,
      'page_size', $7,
      'total_pages', COALESCE(CEIL((SELECT MAX(total_count) FROM hierarquia_construida)::NUMERIC / $7), 0),
      'total_records', COALESCE((SELECT MAX(total_count) FROM hierarquia_construida), 0),
      'hierarquia', COALESCE(
        (SELECT jsonb_agg(
          jsonb_build_object(
            'nome_departamento', h.dept_nivel3,
            'margem', h.margem,
            'nivel2', d2c.nivel2
          )
          ORDER BY h.dept3_valor_vendas DESC
        )
        FROM (SELECT DISTINCT dept3_id, dept_nivel3, margem, dept3_valor_vendas FROM hierarquia_construida) h
        INNER JOIN dept2_completo d2c ON d2c.dept3_id = h.dept3_id),
        '[]'::jsonb
      )
    )
  $query$, p_schema, p_schema, p_schema, p_schema, p_schema);
  
  -- Execute query
  EXECUTE v_query 
  INTO v_result
  USING p_mes, p_ano, p_filial_id, v_offset, p_page_size, p_page, p_page_size;
  
  RETURN v_result;
END;
$$;
