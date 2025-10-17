-- Migration: Create hierarchical venda curva report
-- Description: Relatório de vendas por curva com estrutura hierárquica (dept3 > dept2 > dept1 > produtos)

-- Drop existing function
DROP FUNCTION IF EXISTS get_venda_curva_report(text, integer, integer, bigint, integer, integer);

-- Create the new hierarchical function
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
SECURITY DEFINER
AS $$
DECLARE
  v_query text;
  v_result jsonb;
  v_total_count bigint;
BEGIN
  -- Build dynamic query
  v_query := format($query$
    WITH vendas_agregadas AS (
      SELECT 
        p.id as produto_codigo,
        p.descricao as produto_descricao,
        p.departamento_id,
        p.curva_abcd as curva_venda,
        p.curva_lucro,
        v.filial_id,
        d1.departamento_id as dept1_id,
        d1.descricao as dept1_nome,
        d1.pai_level_2_id as dept2_id,
        d2.descricao as dept2_nome,
        d1.pai_level_3_id as dept3_id,
        d3.descricao as dept3_nome,
        SUM(v.quantidade) as qtde,
        SUM(v.valor_vendas) as valor_vendas,
        SUM(v.valor_vendas - (v.custo_compra * v.quantidade)) as valor_lucro
      FROM %I.vendas v
      INNER JOIN %I.produtos p ON p.id = v.id_produto AND p.filial_id = v.filial_id
      INNER JOIN %I.departments_level_1 d1 ON d1.departamento_id = p.departamento_id
      LEFT JOIN %I.departments_level_2 d2 ON d2.departamento_id = d1.pai_level_2_id
      LEFT JOIN %I.departments_level_3 d3 ON d3.departamento_id = d1.pai_level_3_id
      WHERE 
        EXTRACT(MONTH FROM v.data_venda) = %s
        AND EXTRACT(YEAR FROM v.data_venda) = %s
        AND p.ativo = true
        AND v.valor_vendas > 0
        %s
      GROUP BY 
        p.id, p.descricao, p.departamento_id, p.curva_abcd, p.curva_lucro,
        v.filial_id, d1.departamento_id, d1.descricao, d1.pai_level_2_id, d2.descricao,
        d1.pai_level_3_id, d3.descricao
    ),
    departamentos_nivel3 AS (
      SELECT 
        dept3_id,
        dept3_nome,
        SUM(valor_vendas) as total_vendas_dept3,
        SUM(valor_lucro) as total_lucro_dept3,
        CASE 
          WHEN SUM(valor_vendas) > 0 
          THEN ROUND((SUM(valor_lucro) / SUM(valor_vendas)) * 100, 2)
          ELSE 0 
        END as margem_dept3
      FROM vendas_agregadas
      WHERE dept3_nome IS NOT NULL
      GROUP BY dept3_id, dept3_nome
    ),
    departamentos_nivel2 AS (
      SELECT 
        dept3_id,
        dept2_id,
        dept2_nome,
        SUM(valor_vendas) as total_vendas_dept2,
        SUM(valor_lucro) as total_lucro_dept2,
        CASE 
          WHEN SUM(valor_vendas) > 0 
          THEN ROUND((SUM(valor_lucro) / SUM(valor_vendas)) * 100, 2)
          ELSE 0 
        END as margem_dept2
      FROM vendas_agregadas
      WHERE dept2_nome IS NOT NULL
      GROUP BY dept3_id, dept2_id, dept2_nome
    ),
    departamentos_nivel1 AS (
      SELECT 
        dept3_id,
        dept2_id,
        dept1_id,
        dept1_nome,
        SUM(valor_vendas) as total_vendas_dept1,
        SUM(valor_lucro) as total_lucro_dept1,
        CASE 
          WHEN SUM(valor_vendas) > 0 
          THEN ROUND((SUM(valor_lucro) / SUM(valor_vendas)) * 100, 2)
          ELSE 0 
        END as margem_dept1
      FROM vendas_agregadas
      GROUP BY dept3_id, dept2_id, dept1_id, dept1_nome
    ),
    hierarquia_completa AS (
      SELECT 
        d3.dept3_id,
        d3.dept3_nome,
        d3.total_vendas_dept3,
        d3.total_lucro_dept3,
        d3.margem_dept3,
        jsonb_agg(
          jsonb_build_object(
            'dept2_id', d2.dept2_id,
            'dept2_nome', d2.dept2_nome,
            'valor_venda', ROUND(d2.total_vendas_dept2::numeric, 2),
            'valor_lucro', ROUND(d2.total_lucro_dept2::numeric, 2),
            'margem', d2.margem_dept2,
            'nivel1', (
              SELECT jsonb_agg(
                jsonb_build_object(
                  'dept1_id', d1.dept1_id,
                  'dept1_nome', d1.dept1_nome,
                  'valor_venda', ROUND(d1.total_vendas_dept1::numeric, 2),
                  'valor_lucro', ROUND(d1.total_lucro_dept1::numeric, 2),
                  'margem', d1.margem_dept1,
                  'produtos', (
                    SELECT jsonb_agg(
                      jsonb_build_object(
                        'codigo', va.produto_codigo,
                        'descricao', va.produto_descricao,
                        'filial_id', va.filial_id,
                        'qtde', ROUND(va.qtde::numeric, 2),
                        'valor_vendas', ROUND(va.valor_vendas::numeric, 2),
                        'valor_lucro', ROUND(va.valor_lucro::numeric, 2),
                        'percentual_lucro', CASE 
                          WHEN va.valor_vendas > 0 
                          THEN ROUND((va.valor_lucro / va.valor_vendas) * 100, 2)
                          ELSE 0 
                        END,
                        'curva_venda', COALESCE(va.curva_venda, 'D'),
                        'curva_lucro', COALESCE(va.curva_lucro, 'D')
                      )
                      ORDER BY 
                        CASE va.curva_venda 
                          WHEN 'A' THEN 1 
                          WHEN 'C' THEN 2 
                          WHEN 'B' THEN 3 
                          WHEN 'D' THEN 4 
                          ELSE 5 
                        END,
                        va.valor_vendas DESC
                    )
                    FROM vendas_agregadas va
                    WHERE va.dept1_id = d1.dept1_id
                      AND va.dept2_id = d1.dept2_id
                      AND va.dept3_id = d1.dept3_id
                  )
                )
                ORDER BY d1.total_vendas_dept1 DESC
              )
              FROM departamentos_nivel1 d1
              WHERE d1.dept2_id = d2.dept2_id AND d1.dept3_id = d2.dept3_id
            )
          )
          ORDER BY d2.total_vendas_dept2 DESC
        ) as nivel2
      FROM departamentos_nivel3 d3
      LEFT JOIN departamentos_nivel2 d2 ON d2.dept3_id = d3.dept3_id
      GROUP BY d3.dept3_id, d3.dept3_nome, d3.total_vendas_dept3, d3.total_lucro_dept3, d3.margem_dept3
      ORDER BY d3.total_vendas_dept3 DESC
    ),
    paginacao AS (
      SELECT 
        *,
        ROW_NUMBER() OVER (ORDER BY total_vendas_dept3 DESC) as rn,
        COUNT(*) OVER () as total_count
      FROM hierarquia_completa
    )
    SELECT jsonb_build_object(
      'total_records', COALESCE(MAX(total_count), 0),
      'page', %s,
      'page_size', %s,
      'total_pages', COALESCE(CEIL(MAX(total_count)::numeric / %s), 0),
      'hierarquia', COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'dept3_id', dept3_id,
            'dept3_nome', dept3_nome,
            'valor_venda', ROUND(total_vendas_dept3::numeric, 2),
            'valor_lucro', ROUND(total_lucro_dept3::numeric, 2),
            'margem', margem_dept3,
            'nivel2', nivel2
          )
          ORDER BY total_vendas_dept3 DESC
        ),
        '[]'::jsonb
      )
    ) as result
    FROM paginacao
    WHERE rn > (%s - 1) * %s AND rn <= %s * %s
  $query$,
    p_schema, p_schema, p_schema, p_schema, p_schema,
    p_mes, p_ano,
    CASE WHEN p_filial_id IS NOT NULL THEN format('AND v.filial_id = %s', p_filial_id) ELSE '' END,
    p_page, p_page_size, p_page_size,
    p_page, p_page_size, p_page, p_page_size
  );

  -- Execute query
  EXECUTE v_query INTO v_result;

  RETURN COALESCE(v_result, jsonb_build_object(
    'total_records', 0,
    'page', p_page,
    'page_size', p_page_size,
    'total_pages', 0,
    'hierarquia', '[]'::jsonb
  ));

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao buscar relatório de venda por curva: %', SQLERRM;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_venda_curva_report(text, integer, integer, bigint, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_venda_curva_report(text, integer, integer, bigint, integer, integer) TO service_role;

COMMENT ON FUNCTION get_venda_curva_report IS 'Relatório hierárquico de vendas por curva ABC com departamentos níveis 3, 2, 1 e produtos';
