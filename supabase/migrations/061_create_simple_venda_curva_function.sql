-- Migration: Create optimized venda_curva report function
-- Description: Creates a simplified hierarchical report for sales by ABC curve
-- Author: System
-- Date: 2025-10-17

-- Drop existing function if exists
DROP FUNCTION IF EXISTS get_venda_curva_report(text, integer, integer, bigint, integer, integer);

-- Create the optimized function
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
  v_result jsonb;
  v_offset integer;
  v_query text;
BEGIN
  -- Calculate offset for pagination
  v_offset := (p_page - 1) * p_page_size;
  
  -- Build and execute dynamic query
  v_query := format($query$
    WITH vendas_base AS (
      SELECT 
        v.filial_id,
        p.id as produto_codigo,
        p.descricao as produto_descricao,
        d1.descricao as dept_nivel1,
        d1.departamento_id as dept1_id,
        COALESCE(d2.descricao, 'Sem Nível 2') as dept_nivel2,
        COALESCE(d2.departamento_id, 0) as dept2_id,
        COALESCE(d3.descricao, 'Sem Nível 3') as dept_nivel3,
        COALESCE(d3.departamento_id, 0) as dept3_id,
        SUM(v.quantidade) as qtde,
        SUM(v.valor_vendas) as valor_vendas,
        SUM(COALESCE(v.valor_vendas, 0) - (COALESCE(v.custo_compra, 0) * COALESCE(v.quantidade, 0))) as valor_lucro,
        COALESCE(p.curva_abcd, 'D') as curva_venda,
        COALESCE(p.curva_lucro, 'SL') as curva_lucro,
        CASE 
          WHEN SUM(v.valor_vendas) > 0 
          THEN ROUND((SUM(COALESCE(v.valor_vendas, 0) - (COALESCE(v.custo_compra, 0) * COALESCE(v.quantidade, 0))) / SUM(v.valor_vendas)) * 100, 2)
          ELSE 0 
        END as percentual_lucro
      FROM %I.vendas v
      INNER JOIN %I.produtos p ON p.id = v.id_produto AND p.filial_id = v.filial_id
      INNER JOIN %I.departments_level_1 d1 ON d1.departamento_id = p.departamento_id
      LEFT JOIN %I.departments_level_2 d2 ON d2.departamento_id = d1.pai_level_2_id
      LEFT JOIN %I.departments_level_3 d3 ON d3.departamento_id = d1.pai_level_3_id
      WHERE EXTRACT(MONTH FROM v.data_venda) = %L
        AND EXTRACT(YEAR FROM v.data_venda) = %L
        AND v.valor_vendas > 0
        AND p.ativo = true
        %s
      GROUP BY 
        v.filial_id, p.id, p.descricao,
        d1.descricao, d1.departamento_id,
        d2.descricao, d2.departamento_id,
        d3.descricao, d3.departamento_id,
        p.curva_abcd, p.curva_lucro
    ),
    dept_totais AS (
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
      FROM vendas_base
      GROUP BY dept3_id, dept_nivel3, dept2_id, dept_nivel2, dept1_id, dept_nivel1
    ),
    dept3_ranked AS (
      SELECT DISTINCT ON (dept3_id)
        dept3_id,
        dept_nivel3,
        SUM(total_vendas) OVER (PARTITION BY dept3_id) as dept3_total_vendas,
        SUM(total_lucro) OVER (PARTITION BY dept3_id) as dept3_total_lucro,
        CASE 
          WHEN SUM(total_vendas) OVER (PARTITION BY dept3_id) > 0 
          THEN ROUND((SUM(total_lucro) OVER (PARTITION BY dept3_id) / SUM(total_vendas) OVER (PARTITION BY dept3_id)) * 100, 2)
          ELSE 0 
        END as dept3_margem,
        ROW_NUMBER() OVER (ORDER BY SUM(total_vendas) OVER (PARTITION BY dept3_id) DESC) as rn,
        COUNT(DISTINCT dept3_id) OVER () as total_dept3
      FROM dept_totais
    ),
    dept3_paginado AS (
      SELECT *
      FROM dept3_ranked
      WHERE rn > %L AND rn <= %L
    )
    SELECT jsonb_build_object(
      'page', %L,
      'page_size', %L,
      'total_pages', COALESCE(CEIL(MAX(d3p.total_dept3)::numeric / %L), 0),
      'total_records', COALESCE(MAX(d3p.total_dept3), 0),
      'hierarquia', COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'nome_departamento', d3p.dept_nivel3,
            'margem', d3p.dept3_margem,
            'nivel2', (
              SELECT jsonb_agg(
                jsonb_build_object(
                  'nome_departamento', dt2.dept_nivel2,
                  'margem', dt2.margem_nivel2,
                  'nivel1', (
                    SELECT jsonb_agg(
                      jsonb_build_object(
                        'nome_departamento', dt1.dept_nivel1,
                        'margem', dt1.margem,
                        'produtos', (
                          SELECT jsonb_agg(
                            jsonb_build_object(
                              'codigo', vb.produto_codigo,
                              'descricao', vb.produto_descricao,
                              'filial_id', vb.filial_id,
                              'qtde', ROUND(vb.qtde::numeric, 2),
                              'valor_vendas', ROUND(vb.valor_vendas::numeric, 2),
                              'curva_venda', vb.curva_venda,
                              'valor_lucro', ROUND(vb.valor_lucro::numeric, 2),
                              'percentual_lucro', vb.percentual_lucro,
                              'curva_lucro', vb.curva_lucro
                            )
                            ORDER BY 
                              CASE vb.curva_venda 
                                WHEN 'A' THEN 1 
                                WHEN 'C' THEN 2 
                                WHEN 'B' THEN 3 
                                WHEN 'D' THEN 4 
                                ELSE 5 
                              END,
                              vb.valor_vendas DESC
                          )
                          FROM vendas_base vb
                          WHERE vb.dept1_id = dt1.dept1_id
                            AND vb.dept2_id = dt1.dept2_id
                            AND vb.dept3_id = dt1.dept3_id
                        )
                      )
                      ORDER BY dt1.total_vendas DESC
                    )
                    FROM dept_totais dt1
                    WHERE dt1.dept2_id = dt2.dept2_id
                      AND dt1.dept3_id = dt2.dept3_id
                  )
                )
                ORDER BY dt2.margem_nivel2 DESC
              )
              FROM (
                SELECT DISTINCT ON (dept2_id)
                  dept2_id,
                  dept_nivel2,
                  dept3_id,
                  SUM(total_vendas) OVER (PARTITION BY dept2_id, dept3_id) as total_vendas_nivel2,
                  CASE 
                    WHEN SUM(total_vendas) OVER (PARTITION BY dept2_id, dept3_id) > 0 
                    THEN ROUND((SUM(total_lucro) OVER (PARTITION BY dept2_id, dept3_id) / SUM(total_vendas) OVER (PARTITION BY dept2_id, dept3_id)) * 100, 2)
                    ELSE 0 
                  END as margem_nivel2
                FROM dept_totais
                WHERE dept3_id = d3p.dept3_id
              ) dt2
            )
          )
          ORDER BY d3p.dept3_total_vendas DESC
        ),
        '[]'::jsonb
      )
    )
    FROM dept3_paginado d3p
  $query$,
    p_schema, p_schema, p_schema, p_schema, p_schema,
    p_mes, p_ano,
    CASE WHEN p_filial_id IS NOT NULL THEN format('AND v.filial_id = %L', p_filial_id) ELSE '' END,
    v_offset, v_offset + p_page_size,
    p_page, p_page_size, p_page_size
  );
  
  -- Execute query
  EXECUTE v_query INTO v_result;
  
  RETURN COALESCE(v_result, jsonb_build_object(
    'page', p_page,
    'page_size', p_page_size,
    'total_pages', 0,
    'total_records', 0,
    'hierarquia', '[]'::jsonb
  ));
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao gerar relatório de venda por curva: %', SQLERRM;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION get_venda_curva_report(text, integer, integer, bigint, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_venda_curva_report(text, integer, integer, bigint, integer, integer) TO service_role;

-- Add comment
COMMENT ON FUNCTION get_venda_curva_report IS 'Generates hierarchical sales report by ABC curve with department levels';
