-- Drop existing function
DROP FUNCTION IF EXISTS get_venda_curva_report(text, integer, integer, bigint, integer, integer);

-- Create function that returns hierarchical data like Python version
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
  v_query := format('
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
    -- Agregação de produtos
    produtos_agg AS (
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
      GROUP BY 
        dept3_id, dept_nivel3,
        dept2_id, dept_nivel2,
        dept1_id, dept_nivel1,
        produto_codigo, produto_descricao,
        filial_id, curva_venda, curva_lucro
    ),
    -- Totais por nível 1
    nivel1_totais AS (
      SELECT 
        dept3_id, dept_nivel3,
        dept2_id, dept_nivel2,
        dept1_id, dept_nivel1,
        SUM(valor_vendido) as valor_vendido,
        SUM(lucro_total) as lucro_total,
        CASE 
          WHEN SUM(valor_vendido) > 0 
          THEN ROUND((SUM(lucro_total) / SUM(valor_vendido)) * 100, 2)
          ELSE 0 
        END as percentual_lucro
      FROM produtos_agg
      GROUP BY dept3_id, dept_nivel3, dept2_id, dept_nivel2, dept1_id, dept_nivel1
    ),
    -- Totais por nível 2
    nivel2_totais AS (
      SELECT 
        dept3_id, dept_nivel3,
        dept2_id, dept_nivel2,
        SUM(valor_vendido) as valor_vendido,
        SUM(lucro_total) as lucro_total,
        CASE 
          WHEN SUM(valor_vendido) > 0 
          THEN ROUND((SUM(lucro_total) / SUM(valor_vendido)) * 100, 2)
          ELSE 0 
        END as percentual_lucro
      FROM nivel1_totais
      GROUP BY dept3_id, dept_nivel3, dept2_id, dept_nivel2
    ),
    -- Totais por nível 3 com paginação
    nivel3_totais AS (
      SELECT 
        dept3_id, dept_nivel3,
        SUM(valor_vendido) as valor_vendido,
        SUM(lucro_total) as lucro_total,
        CASE 
          WHEN SUM(valor_vendido) > 0 
          THEN ROUND((SUM(lucro_total) / SUM(valor_vendido)) * 100, 2)
          ELSE 0 
        END as percentual_lucro,
        ROW_NUMBER() OVER (ORDER BY SUM(valor_vendido) DESC) as rn,
        COUNT(*) OVER () as total_count
      FROM nivel2_totais
      GROUP BY dept3_id, dept_nivel3
    ),
    -- Aplicar paginação no nível 3
    nivel3_paginado AS (
      SELECT *
      FROM nivel3_totais
      WHERE rn > %L AND rn <= %L
    ),
    -- Construir hierarquia
    hierarquia AS (
      SELECT 
        n3.dept_nivel3,
        n3.valor_vendido as dept3_valor_vendido,
        n3.lucro_total as dept3_lucro_total,
        n3.percentual_lucro as dept3_percentual_lucro,
        jsonb_agg(
          DISTINCT jsonb_build_object(
            ''tipo'', ''nivel_2'',
            ''nome'', n2.dept_nivel2,
            ''segmento_pai'', n3.dept_nivel3,
            ''valor_vendido'', ROUND(n2.valor_vendido, 2),
            ''lucro_total'', ROUND(n2.lucro_total, 2),
            ''percentual_lucro'', n2.percentual_lucro,
            ''filhos'', (
              SELECT jsonb_agg(
                jsonb_build_object(
                  ''tipo'', ''nivel_1'',
                  ''nome'', n1.dept_nivel1,
                  ''segmento_pai'', n1.dept_nivel2,
                  ''valor_vendido'', ROUND(n1.valor_vendido, 2),
                  ''lucro_total'', ROUND(n1.lucro_total, 2),
                  ''percentual_lucro'', n1.percentual_lucro,
                  ''produtos'', (
                    SELECT jsonb_agg(
                      jsonb_build_object(
                        ''tipo'', ''produto'',
                        ''codigo'', p.produto_codigo,
                        ''nome'', p.produto_descricao,
                        ''segmento_pai'', p.dept_nivel1,
                        ''filial_id'', p.filial_id,
                        ''quantidade_vendida'', ROUND(p.qtde, 2),
                        ''valor_vendido'', ROUND(p.valor_vendido, 2),
                        ''lucro_total'', ROUND(p.lucro_total, 2),
                        ''percentual_lucro'', p.percentual_lucro,
                        ''curva_erp'', p.curva_venda,
                        ''curva_calculada'', p.curva_venda,
                        ''curva_lucro'', p.curva_lucro
                      )
                      ORDER BY 
                        CASE p.curva_venda 
                          WHEN ''A'' THEN 1 
                          WHEN ''C'' THEN 2 
                          WHEN ''B'' THEN 3 
                          WHEN ''D'' THEN 4 
                          ELSE 5 
                        END,
                        p.valor_vendido DESC
                    )
                    FROM produtos_agg p
                    WHERE p.dept1_id = n1.dept1_id
                      AND p.dept2_id = n1.dept2_id
                      AND p.dept3_id = n1.dept3_id
                  )
                )
                ORDER BY n1.valor_vendido DESC
              )
              FROM nivel1_totais n1
              WHERE n1.dept2_id = n2.dept2_id
                AND n1.dept3_id = n2.dept3_id
            )
          )
          ORDER BY n2.valor_vendido DESC
        ) as filhos
      FROM nivel3_paginado n3
      LEFT JOIN nivel2_totais n2 ON n2.dept3_id = n3.dept3_id
      GROUP BY n3.dept3_id, n3.dept_nivel3, n3.valor_vendido, n3.lucro_total, n3.percentual_lucro, n3.rn
      ORDER BY n3.rn
    )
    SELECT jsonb_build_object(
      ''schema'', %L,
      ''mes_referencia'', format(''%%s-%%s-01'', %L, LPAD(%L::text, 2, ''0'')),
      ''filial_id'', %L,
      ''data_geracao'', NOW(),
      ''num_niveis'', 3,
      ''hierarquia'', COALESCE(
        (
          SELECT jsonb_object_agg(
            dept_nivel3,
            jsonb_build_object(
              ''nome'', dept_nivel3,
              ''nivel'', 3,
              ''valor_vendido'', dept3_valor_vendido,
              ''lucro_total'', dept3_lucro_total,
              ''percentual_lucro'', dept3_percentual_lucro,
              ''filhos'', filhos
            )
          )
          FROM hierarquia
        ),
        ''{}''::jsonb
      )
    )
  ', 
  p_schema, p_schema, p_schema, p_schema, p_schema, 
  p_mes, p_ano, p_filial_id, p_filial_id,
  (p_page - 1) * p_page_size, p_page * p_page_size,
  p_schema, p_ano, p_mes, p_filial_id);

  -- Execute and return result
  EXECUTE v_query INTO v_result;
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao gerar relatório de venda por curva: %', SQLERRM;
END;
$$;
