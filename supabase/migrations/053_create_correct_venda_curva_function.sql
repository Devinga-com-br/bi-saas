-- Migration: Create correct venda curva function
-- Data: 2025-10-17
-- Descrição: Cria a função com o nome correto que a API espera

-- Drop funções antigas
DROP FUNCTION IF EXISTS get_venda_curva_report(TEXT, INTEGER, INTEGER, BIGINT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_venda_curva_report(TEXT, INTEGER, INTEGER, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_relatorio_venda_curva(TEXT, INTEGER, INTEGER, TEXT, INTEGER, INTEGER);

-- Criar função com nome correto
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
  v_filial_filter TEXT;
  v_query TEXT;
BEGIN
  v_offset := (p_page - 1) * p_page_size;
  
  -- Construir filtro de filial
  IF p_filial_id IS NOT NULL THEN
    v_filial_filter := format('AND v.filial_id = %L', p_filial_id);
  ELSE
    v_filial_filter := '';
  END IF;

  -- Query principal
  v_query := format('
    WITH vendas_base AS (
      SELECT 
        v.filial_id,
        b.name as filial_nome,
        p.id as produto_codigo,
        p.descricao as produto_descricao,
        p.departamento_id,
        d1.descricao as dept_nivel1,
        d1.pai_level_2_id,
        COALESCE(d2.descricao, ''Sem Departamento Nível 2'') as dept_nivel2,
        d1.pai_level_3_id,
        COALESCE(d3.descricao, ''Sem Departamento Nível 3'') as dept_nivel3,
        SUM(v.quantidade) as qtde,
        SUM(v.valor_vendas) as valor_vendas,
        SUM(COALESCE(v.valor_vendas, 0) - (COALESCE(v.custo_compra, 0) * COALESCE(v.quantidade, 0))) as lucro,
        COALESCE(p.curva_abcd, ''D'') as curva_venda,
        COALESCE(p.curva_lucro, ''D'') as curva_lucro
      FROM %I.vendas v
      INNER JOIN %I.produtos p ON p.id = v.id_produto AND p.filial_id = v.filial_id
      INNER JOIN %I.departments_level_1 d1 ON d1.departamento_id = p.departamento_id
      LEFT JOIN %I.departments_level_2 d2 ON d2.departamento_id = d1.pai_level_2_id
      LEFT JOIN %I.departments_level_3 d3 ON d3.departamento_id = d1.pai_level_3_id
      LEFT JOIN public.branches b ON b.filial_id = v.filial_id AND b.tenant_id = (
        SELECT id FROM public.tenants WHERE supabase_schema = %L LIMIT 1
      )
      WHERE EXTRACT(MONTH FROM v.data_venda) = $1
        AND EXTRACT(YEAR FROM v.data_venda) = $2
        AND v.valor_vendas > 0
        AND p.ativo = true
        %s
      GROUP BY 
        v.filial_id, b.name, p.id, p.descricao, p.departamento_id,
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
        filial_nome,
        SUM(qtde) as qtde,
        SUM(valor_vendas) as valor_vendas,
        SUM(lucro) as lucro,
        curva_venda,
        curva_lucro,
        CASE 
          WHEN SUM(valor_vendas) > 0 
          THEN ROUND((SUM(lucro) / SUM(valor_vendas)) * 100, 2)
          ELSE 0 
        END as percentual_lucro
      FROM vendas_base
      GROUP BY dept_nivel3, dept_nivel2, dept_nivel1, produto_codigo, produto_descricao, 
               filial_id, filial_nome, curva_venda, curva_lucro
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
        valor_vendas DESC
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
      ''page'', $5,
      ''page_size'', $6,
      ''total_pages'', COALESCE(CEIL(MAX(total_count)::NUMERIC / $6), 0),
      ''data'', COALESCE(
        jsonb_agg(
          jsonb_build_object(
            ''dept_nivel3'', dept_nivel3,
            ''dept_nivel2'', dept_nivel2,
            ''dept_nivel1'', dept_nivel1,
            ''produto_codigo'', produto_codigo,
            ''produto_descricao'', produto_descricao,
            ''filial_id'', filial_id,
            ''filial_nome'', COALESCE(filial_nome, ''Filial '' || filial_id::text),
            ''qtde'', ROUND(qtde::numeric, 2),
            ''valor_vendas'', ROUND(valor_vendas::numeric, 2),
            ''curva_venda'', curva_venda,
            ''valor_lucro'', ROUND(lucro::numeric, 2),
            ''percentual_lucro'', percentual_lucro,
            ''curva_lucro'', curva_lucro
          )
        ),
        ''[]''::jsonb
      )
    )
    FROM paginacao
    WHERE rn > $3 AND rn <= $3 + $6
  ', p_schema, p_schema, p_schema, p_schema, p_schema, p_schema, v_filial_filter);

  RAISE LOG 'Query venda_curva: %', v_query;

  EXECUTE v_query
  INTO v_result
  USING p_mes, p_ano, v_offset, v_offset, p_page, p_page_size;

  RETURN COALESCE(v_result, '{"data": [], "total_records": 0, "page": 1, "page_size": 50, "total_pages": 0}'::jsonb);
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in get_venda_curva_report: % - %', SQLERRM, SQLSTATE;
    RAISE;
END;
$$;

COMMENT ON FUNCTION get_venda_curva_report IS 'Relatório de Vendas por Curva ABC com departamentos e produtos';
