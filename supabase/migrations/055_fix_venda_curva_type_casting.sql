-- Migration: Fix venda curva function type casting
-- Data: 2025-10-17
-- Descrição: Corrige conversão de tipos na função get_venda_curva_report

DROP FUNCTION IF EXISTS get_venda_curva_report(TEXT, INTEGER, INTEGER, BIGINT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_venda_curva_report(
  p_schema TEXT,
  p_mes INTEGER,
  p_ano INTEGER,
  p_filial_id BIGINT DEFAULT NULL,
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
  v_query TEXT;
BEGIN
  v_offset := (p_page - 1) * p_page_size;

  -- Query principal
  v_query := format('
    WITH vendas_base AS (
      SELECT 
        v.filial_id,
        p.id as produto_codigo,
        p.descricao as produto_descricao,
        p.departamento_id,
        d1.descricao as dept_nivel1,
        d1.pai_level_2_id,
        COALESCE(d2.descricao, ''Sem Departamento Nível 2'') as dept_nivel2,
        d1.pai_level_3_id,
        COALESCE(d3.descricao, ''Sem Departamento Nível 3'') as dept_nivel3,
        SUM(v.quantidade) as qtde,
        SUM(v.valor_vendas) as total_vendas,
        SUM(COALESCE(v.valor_vendas, 0) - (COALESCE(v.custo_compra, 0) * COALESCE(v.quantidade, 0))) as total_lucro,
        COALESCE(p.curva_abcd, ''D'') as curva_venda,
        COALESCE(p.curva_lucro, ''D'') as curva_lucro
      FROM %I.vendas v
      INNER JOIN %I.produtos p ON p.id = v.id_produto AND p.filial_id = v.filial_id
      INNER JOIN %I.departments_level_1 d1 ON d1.departamento_id = p.departamento_id
      LEFT JOIN %I.departments_level_2 d2 ON d2.departamento_id = d1.pai_level_2_id
      LEFT JOIN %I.departments_level_3 d3 ON d3.departamento_id = d1.pai_level_3_id
      WHERE EXTRACT(MONTH FROM v.data_venda) = %s
        AND EXTRACT(YEAR FROM v.data_venda) = %s
        AND v.valor_vendas > 0
        AND p.ativo = true
        AND ($1 IS NULL OR v.filial_id = $1)
      GROUP BY 
        v.filial_id, p.id, p.descricao, p.departamento_id,
        d1.descricao, d1.pai_level_2_id, d2.descricao, d1.pai_level_3_id, d3.descricao,
        p.curva_abcd, p.curva_lucro
    ),
    dados_agrupados AS (
      SELECT 
        dept_nivel3,
        dept_nivel2,
        dept_nivel1,
        produto_codigo,
        produto_descricao,
        filial_id,
        SUM(qtde) as qtde,
        SUM(total_vendas) as total_vendas,
        SUM(total_lucro) as total_lucro,
        curva_venda,
        curva_lucro,
        CASE 
          WHEN SUM(total_vendas) > 0 
          THEN ROUND((SUM(total_lucro) / SUM(total_vendas)) * 100, 2)
          ELSE 0 
        END as percentual_lucro
      FROM vendas_base
      GROUP BY dept_nivel3, dept_nivel2, dept_nivel1, produto_codigo, produto_descricao, 
               filial_id, curva_venda, curva_lucro
      ORDER BY 
        dept_nivel3,
        dept_nivel2,
        dept_nivel1,
        CASE curva_venda 
          WHEN ''A'' THEN 1 
          WHEN ''C'' THEN 2 
          WHEN ''B'' THEN 3 
          WHEN ''D'' THEN 4 
          ELSE 5 
        END,
        total_vendas DESC
    ),
    paginacao AS (
      SELECT 
        *,
        ROW_NUMBER() OVER () as rn,
        COUNT(*) OVER () as total_count
      FROM dados_agrupados
    )
    SELECT jsonb_build_object(
      ''total_records'', COALESCE(MAX(total_count), 0),
      ''page'', %s,
      ''page_size'', %s,
      ''total_pages'', COALESCE(CEIL(MAX(total_count)::NUMERIC / %s), 0),
      ''data'', COALESCE(
        jsonb_agg(
          jsonb_build_object(
            ''dept_nivel3'', dept_nivel3,
            ''dept_nivel2'', dept_nivel2,
            ''dept_nivel1'', dept_nivel1,
            ''produto_codigo'', produto_codigo,
            ''produto_descricao'', produto_descricao,
            ''filial_id'', filial_id,
            ''qtde'', ROUND(qtde::numeric, 2),
            ''valor_vendas'', ROUND(total_vendas::numeric, 2),
            ''curva_venda'', curva_venda,
            ''valor_lucro'', ROUND(total_lucro::numeric, 2),
            ''percentual_lucro'', percentual_lucro,
            ''curva_lucro'', curva_lucro
          )
        ),
        ''[]''::jsonb
      )
    )
    FROM paginacao
    WHERE rn > %s AND rn <= %s
  ', p_schema, p_schema, p_schema, p_schema, p_schema, 
     p_mes, p_ano, p_page, p_page_size, p_page_size, v_offset, v_offset + p_page_size);

  RAISE LOG 'Query venda_curva: %', v_query;

  EXECUTE v_query
  INTO v_result
  USING p_filial_id;

  RETURN COALESCE(v_result, '{"data": [], "total_records": 0, "page": 1, "page_size": 50, "total_pages": 0}'::jsonb);
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in get_venda_curva_report: % - %', SQLERRM, SQLSTATE;
    RAISE;
END;
$$;

COMMENT ON FUNCTION get_venda_curva_report IS 'Relatório de Vendas por Curva ABC com departamentos e produtos';
