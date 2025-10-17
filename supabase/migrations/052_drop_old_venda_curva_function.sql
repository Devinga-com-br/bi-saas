-- Migration: Drop old venda curva functions
-- Data: 2025-10-17
-- Descrição: Remove funções antigas que podem estar causando conflito

-- Drop função antiga se existir
DROP FUNCTION IF EXISTS get_venda_curva_report(TEXT, INTEGER, INTEGER, BIGINT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_venda_curva_report(TEXT, INTEGER, INTEGER, TEXT, INTEGER, INTEGER);

-- Garantir que a função correta existe
DROP FUNCTION IF EXISTS get_relatorio_venda_curva(TEXT, INTEGER, INTEGER, TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_relatorio_venda_curva(
  p_schema TEXT,
  p_mes INTEGER,
  p_ano INTEGER,
  p_filial_id TEXT DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_offset INTEGER;
  v_filial_filter TEXT;
  v_query TEXT;
BEGIN
  v_offset := (p_page - 1) * p_page_size;
  
  -- Construir filtro de filial
  IF p_filial_id IS NOT NULL AND p_filial_id != 'all' THEN
    v_filial_filter := format('AND v.filial_id = %L::bigint', p_filial_id);
  ELSE
    v_filial_filter := '';
  END IF;

  -- Query principal
  v_query := format('
    WITH vendas_base AS (
      SELECT 
        v.filial_id,
        v.filial_id::text as filial_nome,
        p.id as produto_id,
        p.descricao as produto_descricao,
        p.departamento_id,
        d1.descricao as dept1_nome,
        d1.pai_level_2_id,
        COALESCE(d2.descricao, ''Sem Departamento Nível 2'') as dept2_nome,
        d1.pai_level_3_id,
        COALESCE(d3.descricao, ''Sem Departamento Nível 3'') as dept3_nome,
        SUM(v.quantidade) as quantidade_total,
        SUM(v.valor_vendas) as total_vendas,
        SUM(COALESCE(v.custo_compra, 0) * COALESCE(v.quantidade, 0)) as total_custo,
        SUM(COALESCE(v.valor_vendas, 0) - (COALESCE(v.custo_compra, 0) * COALESCE(v.quantidade, 0))) as total_lucro,
        COALESCE(p.curva_abcd, ''D'') as curva_venda,
        COALESCE(p.curva_lucro, ''D'') as curva_lucro
      FROM %I.vendas v
      INNER JOIN %I.produtos p ON p.id = v.id_produto AND p.filial_id = v.filial_id
      INNER JOIN %I.departments_level_1 d1 ON d1.departamento_id = p.departamento_id
      LEFT JOIN %I.departments_level_2 d2 ON d2.departamento_id = d1.pai_level_2_id
      LEFT JOIN %I.departments_level_3 d3 ON d3.departamento_id = d1.pai_level_3_id
      WHERE EXTRACT(MONTH FROM v.data_venda) = $1
        AND EXTRACT(YEAR FROM v.data_venda) = $2
        AND v.valor_vendas > 0
        AND p.ativo = true
        %s
      GROUP BY 
        v.filial_id, p.id, p.descricao, p.departamento_id,
        d1.descricao, d1.pai_level_2_id, d2.descricao, d1.pai_level_3_id, d3.descricao,
        p.curva_abcd, p.curva_lucro
    ),
    totais_dept3 AS (
      SELECT 
        COALESCE(pai_level_3_id, 0) as dept3_id,
        dept3_nome,
        COALESCE(pai_level_2_id, 0) as dept2_id,
        dept2_nome,
        SUM(total_vendas) as total_vendas,
        SUM(total_lucro) as total_lucro,
        CASE 
          WHEN SUM(total_vendas) > 0 
          THEN ROUND((SUM(total_lucro) / SUM(total_vendas)) * 100, 2)
          ELSE 0 
        END as margem
      FROM vendas_base
      GROUP BY COALESCE(pai_level_3_id, 0), dept3_nome, COALESCE(pai_level_2_id, 0), dept2_nome
    ),
    totais_dept2 AS (
      SELECT 
        COALESCE(pai_level_2_id, 0) as dept2_id,
        dept2_nome,
        SUM(total_vendas) as total_vendas,
        SUM(total_lucro) as total_lucro,
        CASE 
          WHEN SUM(total_vendas) > 0 
          THEN ROUND((SUM(total_lucro) / SUM(total_vendas)) * 100, 2)
          ELSE 0 
        END as margem
      FROM vendas_base
      GROUP BY COALESCE(pai_level_2_id, 0), dept2_nome
    ),
    totais_dept1 AS (
      SELECT 
        departamento_id as dept1_id,
        dept1_nome,
        SUM(total_vendas) as total_vendas,
        SUM(total_lucro) as total_lucro,
        CASE 
          WHEN SUM(total_vendas) > 0 
          THEN ROUND((SUM(total_lucro) / SUM(total_vendas)) * 100, 2)
          ELSE 0 
        END as margem
      FROM vendas_base
      GROUP BY departamento_id, dept1_nome
    ),
    dept3_paginado AS (
      SELECT dept3_id, dept3_nome, dept2_id, dept2_nome, total_vendas, total_lucro, margem,
             ROW_NUMBER() OVER (ORDER BY total_vendas DESC) as rn
      FROM totais_dept3
    )
    SELECT jsonb_build_object(
      ''total_records'', (SELECT COUNT(*) FROM totais_dept3),
      ''page'', $5,
      ''page_size'', $6,
      ''total_pages'', CEIL((SELECT COUNT(*)::NUMERIC FROM totais_dept3) / $6),
      ''departamentos_nivel1'', (
        SELECT COALESCE(jsonb_agg(dept1_obj ORDER BY total_vendas DESC), ''[]''::jsonb)
        FROM (
          SELECT jsonb_build_object(
            ''departamento_id'', td1.dept1_id,
            ''departamento_nome'', td1.dept1_nome,
            ''valor_venda'', ROUND(td1.total_vendas::numeric, 2),
            ''valor_lucro'', ROUND(td1.total_lucro::numeric, 2),
            ''margem'', td1.margem,
            ''departamentos_nivel2'', (
              SELECT COALESCE(jsonb_agg(dept2_obj ORDER BY total_vendas DESC), ''[]''::jsonb)
              FROM (
                SELECT jsonb_build_object(
                  ''departamento_id'', td2.dept2_id,
                  ''departamento_nome'', td2.dept2_nome,
                  ''valor_venda'', ROUND(td2.total_vendas::numeric, 2),
                  ''valor_lucro'', ROUND(td2.total_lucro::numeric, 2),
                  ''margem'', td2.margem,
                  ''departamentos_nivel3'', (
                    SELECT COALESCE(jsonb_agg(dept3_obj ORDER BY total_vendas DESC), ''[]''::jsonb)
                    FROM (
                      SELECT jsonb_build_object(
                        ''departamento_id'', td3.dept3_id,
                        ''departamento_nome'', td3.dept3_nome,
                        ''valor_venda'', ROUND(td3.total_vendas::numeric, 2),
                        ''valor_lucro'', ROUND(td3.total_lucro::numeric, 2),
                        ''margem'', td3.margem,
                        ''produtos'', (
                          SELECT COALESCE(jsonb_agg(
                            jsonb_build_object(
                              ''produto_id'', vb.produto_id,
                              ''filial_id'', vb.filial_id,
                              ''filial_nome'', vb.filial_nome,
                              ''codigo'', vb.produto_id,
                              ''descricao'', vb.produto_descricao,
                              ''quantidade'', ROUND(vb.quantidade_total::numeric, 2),
                              ''valor_venda'', ROUND(vb.total_vendas::numeric, 2),
                              ''curva_venda'', vb.curva_venda,
                              ''valor_lucro'', ROUND(vb.total_lucro::numeric, 2),
                              ''percentual_lucro'', CASE 
                                WHEN vb.total_vendas > 0 
                                THEN ROUND((vb.total_lucro / vb.total_vendas) * 100, 2)
                                ELSE 0 
                              END,
                              ''curva_lucro'', vb.curva_lucro
                            )
                            ORDER BY 
                              CASE vb.curva_venda 
                                WHEN ''A'' THEN 1 
                                WHEN ''C'' THEN 2 
                                WHEN ''B'' THEN 3 
                                WHEN ''D'' THEN 4 
                                ELSE 5 
                              END,
                              vb.total_vendas DESC
                          ), ''[]''::jsonb)
                          FROM vendas_base vb
                          WHERE COALESCE(vb.pai_level_3_id, 0) = td3.dept3_id
                        )
                      ) as dept3_obj
                      FROM dept3_paginado td3
                      WHERE td3.dept2_id = td2.dept2_id
                        AND td3.rn > $3 
                        AND td3.rn <= $3 + $6
                    ) dept3_sub
                  )
                ) as dept2_obj
                FROM totais_dept2 td2
                WHERE EXISTS (
                  SELECT 1 FROM vendas_base vb 
                  WHERE COALESCE(vb.pai_level_2_id, 0) = td2.dept2_id 
                    AND vb.departamento_id = td1.dept1_id
                )
              ) dept2_sub
            )
          ) as dept1_obj
          FROM totais_dept1 td1
          WHERE EXISTS (
            SELECT 1 FROM dept3_paginado 
            WHERE rn > $3 AND rn <= $3 + $6
              AND EXISTS (
                SELECT 1 FROM vendas_base vb2
                WHERE vb2.departamento_id = td1.dept1_id
              )
          )
        ) dept1_sub
      )
    )
  ', p_schema, p_schema, p_schema, p_schema, p_schema, v_filial_filter);

  RAISE LOG 'Query venda_curva: %', v_query;

  EXECUTE v_query
  INTO v_result
  USING p_mes, p_ano, v_offset, v_offset, p_page, p_page_size;

  RETURN COALESCE(v_result, '{"departamentos_nivel1": [], "total_records": 0, "page": 1, "page_size": 50, "total_pages": 0}'::jsonb);
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in get_relatorio_venda_curva: % - %', SQLERRM, SQLSTATE;
    RAISE;
END;
$$;

COMMENT ON FUNCTION get_relatorio_venda_curva IS 'Relatório de Vendas por Curva ABC agrupado por departamentos (níveis 1, 2, 3) e produtos';
