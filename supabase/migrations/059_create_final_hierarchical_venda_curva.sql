-- Migration: Venda Curva Report Function - Final Hierarchical Version
-- Description: Creates function to generate hierarchical sales report by curve ABC
-- Date: 2025-01-17

-- Drop existing function if exists
DROP FUNCTION IF EXISTS public.get_venda_curva_report(text, integer, integer, bigint, integer, integer);

-- Create function to get venda curva report with hierarchical structure
CREATE OR REPLACE FUNCTION public.get_venda_curva_report(
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
  v_offset integer;
BEGIN
  -- Validate schema name to prevent SQL injection
  IF p_schema !~ '^[a-zA-Z0-9_]+$' THEN
    RAISE EXCEPTION 'Invalid schema name';
  END IF;

  -- Calculate offset for pagination
  v_offset := (p_page - 1) * p_page_size;

  -- Build dynamic query with schema - hierarchical structure
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
    hierarquia AS (
      SELECT 
        d3.dept3_id,
        d3.dept_nivel3,
        d3.margem,
        d3.total_vendas as dept3_valor_vendas,
        d3.total_lucro as dept3_valor_lucro,
        d3.rn,
        jsonb_agg(
          DISTINCT jsonb_build_object(
            'nome_departamento', d2.dept_nivel2,
            'margem', d2.margem,
            'nivel1', (
              SELECT jsonb_agg(
                jsonb_build_object(
                  'nome_departamento', d1.dept_nivel1,
                  'dept1_id', d1.dept1_id,
                  'margem', d1.margem,
                  'produtos', (
                    SELECT jsonb_agg(
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
                    )
                    FROM produtos_agrupados p
                    WHERE p.dept1_id = d1.dept1_id
                      AND p.dept2_id = d1.dept2_id
                      AND p.dept3_id = d1.dept3_id
                  )
                )
                ORDER BY d1.total_vendas DESC
              )
              FROM dept1_totais d1
              WHERE d1.dept2_id = d2.dept2_id
                AND d1.dept3_id = d2.dept3_id
            )
          )
          ORDER BY d2.total_vendas DESC
        ) as nivel2
      FROM dept3_paginado d3
      LEFT JOIN dept2_totais d2 ON d2.dept3_id = d3.dept3_id
      GROUP BY d3.dept3_id, d3.dept_nivel3, d3.margem, d3.total_vendas, d3.total_lucro, d3.rn
      ORDER BY d3.rn
    )
    SELECT jsonb_build_object(
      'page', $6,
      'page_size', $7,
      'hierarquia', COALESCE(
        (SELECT jsonb_agg(
          jsonb_build_object(
            'nome_departamento', dept_nivel3,
            'margem', margem,
            'nivel2', nivel2
          )
          ORDER BY dept3_valor_vendas DESC
        )
        FROM hierarquia),
        '[]'::jsonb
      )
    )
  $query$,
    p_schema, p_schema, p_schema, p_schema, p_schema
  );

  -- Execute query with parameters
  EXECUTE v_query INTO v_result 
    USING p_mes, p_ano, p_filial_id, v_offset, p_page_size, p_page, p_page_size;

  RETURN v_result;
END;
$$;
