-- Drop existing function if exists
DROP FUNCTION IF EXISTS get_venda_curva_report(text, integer, integer, bigint, integer, integer);

-- Create hierarchical sales report function
CREATE OR REPLACE FUNCTION get_venda_curva_report(
  p_schema text,
  p_mes integer,
  p_ano integer,
  p_filial_id bigint DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_query text;
  v_result jsonb;
BEGIN
  -- Build dynamic query
  v_query := format($query$
    WITH vendas_aggregated AS (
      SELECT 
        v.filial_id,
        p.id as produto_codigo,
        p.descricao as produto_descricao,
        p.departamento_id,
        d1.descricao as dept_nivel1,
        d1.pai_level_2_id,
        COALESCE(d2.descricao, 'Sem Departamento Nível 2') as dept_nivel2,
        d2.departamento_id as dept2_id,
        d1.pai_level_3_id,
        COALESCE(d3.descricao, 'Sem Departamento Nível 3') as dept_nivel3,
        d3.departamento_id as dept3_id,
        SUM(v.quantidade) as qtde,
        SUM(v.valor_vendas) as valor_vendas,
        SUM(COALESCE(v.valor_vendas, 0) - (COALESCE(v.custo_compra, 0) * COALESCE(v.quantidade, 0))) as valor_lucro,
        COALESCE(p.curva_abcd, 'D') as curva_venda,
        COALESCE(p.curva_lucro, 'D') as curva_lucro
      FROM %I.vendas v
      INNER JOIN %I.produtos p ON p.id = v.id_produto AND p.filial_id = v.filial_id
      INNER JOIN %I.departments_level_1 d1 ON d1.departamento_id = p.departamento_id
      LEFT JOIN %I.departments_level_2 d2 ON d2.departamento_id = d1.pai_level_2_id
      LEFT JOIN %I.departments_level_3 d3 ON d3.departamento_id = d1.pai_level_3_id
      WHERE EXTRACT(MONTH FROM v.data_venda) = %s
        AND EXTRACT(YEAR FROM v.data_venda) = %s
        AND v.valor_vendas > 0
        AND p.ativo = true
        AND (%s IS NULL OR v.filial_id = %s)
      GROUP BY 
        v.filial_id, p.id, p.descricao, p.departamento_id,
        d1.descricao, d1.pai_level_2_id, d2.descricao, d2.departamento_id,
        d1.pai_level_3_id, d3.descricao, d3.departamento_id,
        p.curva_abcd, p.curva_lucro
    ),
    produtos_ranked AS (
      SELECT 
        *,
        CASE 
          WHEN valor_vendas > 0 
          THEN ROUND((valor_lucro / valor_vendas) * 100, 2)
          ELSE 0 
        END as percentual_lucro,
        CASE curva_venda 
          WHEN 'A' THEN 1 
          WHEN 'C' THEN 2 
          WHEN 'B' THEN 3 
          WHEN 'D' THEN 4 
          ELSE 5 
        END as ordem_curva,
        ROW_NUMBER() OVER (
          PARTITION BY dept3_id, dept2_id, dept_nivel1
          ORDER BY 
            CASE curva_venda 
              WHEN 'A' THEN 1 
              WHEN 'C' THEN 2 
              WHEN 'B' THEN 3 
              WHEN 'D' THEN 4 
              ELSE 5 
            END,
            valor_vendas DESC
        ) as produto_rank
      FROM vendas_aggregated
    ),
    dept_nivel1_agg AS (
      SELECT 
        dept3_id,
        dept_nivel3,
        dept2_id,
        dept_nivel2,
        dept_nivel1,
        departamento_id as dept1_id,
        SUM(valor_vendas) as total_vendas_n1,
        SUM(valor_lucro) as total_lucro_n1,
        CASE 
          WHEN SUM(valor_vendas) > 0 
          THEN ROUND((SUM(valor_lucro) / SUM(valor_vendas)) * 100, 2)
          ELSE 0 
        END as margem_n1
      FROM produtos_ranked
      GROUP BY dept3_id, dept_nivel3, dept2_id, dept_nivel2, dept_nivel1, departamento_id
    ),
    dept_nivel2_agg AS (
      SELECT 
        dept3_id,
        dept_nivel3,
        dept2_id,
        dept_nivel2,
        SUM(total_vendas_n1) as total_vendas_n2,
        SUM(total_lucro_n1) as total_lucro_n2,
        CASE 
          WHEN SUM(total_vendas_n1) > 0 
          THEN ROUND((SUM(total_lucro_n1) / SUM(total_vendas_n1)) * 100, 2)
          ELSE 0 
        END as margem_n2
      FROM dept_nivel1_agg
      GROUP BY dept3_id, dept_nivel3, dept2_id, dept_nivel2
    ),
    dept_nivel3_agg AS (
      SELECT 
        dept3_id,
        dept_nivel3,
        SUM(total_vendas_n2) as total_vendas_n3,
        SUM(total_lucro_n2) as total_lucro_n3,
        CASE 
          WHEN SUM(total_vendas_n2) > 0 
          THEN ROUND((SUM(total_lucro_n2) / SUM(total_vendas_n2)) * 100, 2)
          ELSE 0 
        END as margem_n3
      FROM dept_nivel2_agg
      GROUP BY dept3_id, dept_nivel3
    ),
    hierarquia_completa AS (
      SELECT 
        d3.dept3_id,
        d3.dept_nivel3,
        d3.margem_n3,
        d3.total_vendas_n3,
        d3.total_lucro_n3,
        jsonb_agg(
          jsonb_build_object(
            'dept2_id', d2.dept2_id,
            'dept_nivel2', d2.dept_nivel2,
            'margem', d2.margem_n2,
            'total_vendas', ROUND(d2.total_vendas_n2::numeric, 2),
            'total_lucro', ROUND(d2.total_lucro_n2::numeric, 2),
            'nivel1', (
              SELECT jsonb_agg(
                jsonb_build_object(
                  'dept1_id', d1.dept1_id,
                  'dept_nivel1', d1.dept_nivel1,
                  'margem', d1.margem_n1,
                  'total_vendas', ROUND(d1.total_vendas_n1::numeric, 2),
                  'total_lucro', ROUND(d1.total_lucro_n1::numeric, 2),
                  'produtos', (
                    SELECT jsonb_agg(
                      jsonb_build_object(
                        'codigo', pr.produto_codigo,
                        'descricao', pr.produto_descricao,
                        'filial_id', pr.filial_id,
                        'qtde', ROUND(pr.qtde::numeric, 2),
                        'valor_vendas', ROUND(pr.valor_vendas::numeric, 2),
                        'curva_venda', pr.curva_venda,
                        'valor_lucro', ROUND(pr.valor_lucro::numeric, 2),
                        'percentual_lucro', pr.percentual_lucro,
                        'curva_lucro', pr.curva_lucro
                      )
                      ORDER BY pr.ordem_curva, pr.valor_vendas DESC
                    )
                    FROM produtos_ranked pr
                    WHERE pr.dept3_id = d1.dept3_id
                      AND pr.dept2_id = d1.dept2_id
                      AND pr.dept_nivel1 = d1.dept_nivel1
                      AND pr.produto_rank <= %s
                  )
                )
                ORDER BY d1.total_vendas_n1 DESC
              )
              FROM dept_nivel1_agg d1
              WHERE d1.dept3_id = d2.dept3_id
                AND d1.dept2_id = d2.dept2_id
            )
          )
          ORDER BY d2.total_vendas_n2 DESC
        ) as nivel2
      FROM dept_nivel3_agg d3
      LEFT JOIN dept_nivel2_agg d2 ON d2.dept3_id = d3.dept3_id
      GROUP BY d3.dept3_id, d3.dept_nivel3, d3.margem_n3, d3.total_vendas_n3, d3.total_lucro_n3
    ),
    paginacao AS (
      SELECT 
        *,
        ROW_NUMBER() OVER (ORDER BY total_vendas_n3 DESC) as rn,
        COUNT(*) OVER () as total_count
      FROM hierarquia_completa
    )
    SELECT jsonb_build_object(
      'page', %s,
      'page_size', %s,
      'total_records', COALESCE(MAX(total_count), 0),
      'total_pages', COALESCE(CEIL(MAX(total_count)::numeric / %s), 0),
      'hierarquia', COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'dept3_id', dept3_id,
            'dept_nivel3', dept_nivel3,
            'margem', margem_n3,
            'total_vendas', ROUND(total_vendas_n3::numeric, 2),
            'total_lucro', ROUND(total_lucro_n3::numeric, 2),
            'nivel2', nivel2
          )
          ORDER BY total_vendas_n3 DESC
        ),
        '[]'::jsonb
      )
    ) as result
    FROM paginacao
    WHERE rn > (%s - 1) * %s AND rn <= %s * %s
  $query$,
    p_schema, p_schema, p_schema, p_schema, p_schema,  -- Schema names
    p_mes, p_ano,  -- Date filters
    p_filial_id, p_filial_id,  -- Filial filter
    p_page_size,  -- Products limit per dept
    p_page, p_page_size, p_page_size,  -- Pagination
    p_page, p_page_size, p_page, p_page_size  -- Pagination range
  );

  -- Execute query
  EXECUTE v_query INTO v_result;

  -- Return result
  RETURN COALESCE(v_result->'result', '{}'::jsonb);

END;
$$;
