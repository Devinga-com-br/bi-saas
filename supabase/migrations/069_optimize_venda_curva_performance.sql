-- ============================================
-- Migration 069: Optimize Venda Curva Performance
-- ============================================
-- Data: 2025-10-21
-- Descrição: Otimiza performance do relatório de venda por curva
-- Adiciona índices e otimiza a query para evitar timeouts

-- Step 1: Create helper function to create indexes for any schema
CREATE OR REPLACE FUNCTION create_venda_curva_indexes(p_schema text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Index para filtro por data e filial (usado em todos os relatórios)
  EXECUTE format('
    CREATE INDEX IF NOT EXISTS idx_vendas_data_filial_valor 
    ON %I.vendas (data_venda, filial_id) 
    WHERE valor_vendas > 0
  ', p_schema);

  -- Index para join com produtos
  EXECUTE format('
    CREATE INDEX IF NOT EXISTS idx_vendas_produto_filial 
    ON %I.vendas (id_produto, filial_id)
  ', p_schema);

  -- Index em produtos para ativo e departamento
  EXECUTE format('
    CREATE INDEX IF NOT EXISTS idx_produtos_ativo_dept 
    ON %I.produtos (departamento_id, ativo, curva_abcd) 
    WHERE ativo = true
  ', p_schema);

  -- Index em departments_level_1 para joins
  EXECUTE format('
    CREATE INDEX IF NOT EXISTS idx_dept1_pais 
    ON %I.departments_level_1 (pai_level_2_id, pai_level_3_id)
  ', p_schema);

  -- Index em departments_level_2 para joins
  EXECUTE format('
    CREATE INDEX IF NOT EXISTS idx_dept2_departamento 
    ON %I.departments_level_2 (departamento_id)
  ', p_schema);

  -- Index em departments_level_3 para joins
  EXECUTE format('
    CREATE INDEX IF NOT EXISTS idx_dept3_departamento 
    ON %I.departments_level_3 (departamento_id)
  ', p_schema);

  -- Analyze tables to update statistics
  EXECUTE format('ANALYZE %I.vendas', p_schema);
  EXECUTE format('ANALYZE %I.produtos', p_schema);
  EXECUTE format('ANALYZE %I.departments_level_1', p_schema);
  EXECUTE format('ANALYZE %I.departments_level_2', p_schema);
  EXECUTE format('ANALYZE %I.departments_level_3', p_schema);
  
  RAISE NOTICE 'Indexes created successfully for schema: %', p_schema;
END;
$$;

-- Create indexes for existing schemas
-- Add more schemas as needed
SELECT create_venda_curva_indexes('okilao');
-- Uncomment and add other schemas:
-- SELECT create_venda_curva_indexes('saoluiz');
-- SELECT create_venda_curva_indexes('paraiso');
-- SELECT create_venda_curva_indexes('lucia');


-- Step 2: Create optimized function
DROP FUNCTION IF EXISTS get_venda_curva_report(text, integer, integer, bigint, integer, integer);

CREATE OR REPLACE FUNCTION get_venda_curva_report(
  p_schema text,
  p_mes integer,
  p_ano integer,
  p_filial_id bigint DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 50
)
RETURNS TABLE (
  dept_nivel3 text,
  dept_nivel2 text,
  dept_nivel1 text,
  produto_codigo bigint,
  produto_descricao text,
  filial_id bigint,
  qtde numeric,
  valor_vendas numeric,
  valor_lucro numeric,
  percentual_lucro numeric,
  curva_venda text,
  curva_lucro text
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_offset integer;
  v_data_inicio date;
  v_data_fim date;
BEGIN
  v_offset := (p_page - 1) * p_page_size;
  
  -- Calculate date range for better index usage
  v_data_inicio := make_date(p_ano, p_mes, 1);
  v_data_fim := (v_data_inicio + interval '1 month')::date;
  
  -- Optimized query with single table scan
  RETURN QUERY EXECUTE format('
    WITH vendas_agregadas AS (
      -- Single scan of vendas table with all necessary joins
      SELECT 
        COALESCE(d3.descricao, ''Sem Nível 3'') as dept3_nome,
        COALESCE(d2.descricao, ''Sem Nível 2'') as dept2_nome,
        d1.descricao as dept1_nome,
        p.id as produto_id,
        p.descricao as produto_nome,
        v.filial_id,
        COALESCE(p.curva_abcd, ''D'') as curva_venda,
        COALESCE(p.curva_lucro, ''D'') as curva_lucro,
        SUM(v.quantidade) as total_qtde,
        SUM(v.valor_vendas) as total_valor_vendas,
        SUM(COALESCE(v.valor_vendas, 0) - (COALESCE(v.custo_compra, 0) * COALESCE(v.quantidade, 0))) as total_lucro
      FROM %I.vendas v
      INNER JOIN %I.produtos p 
        ON p.id = v.id_produto 
        AND p.filial_id = v.filial_id
        AND p.ativo = true
      INNER JOIN %I.departments_level_1 d1 
        ON d1.departamento_id = p.departamento_id
      LEFT JOIN %I.departments_level_2 d2 
        ON d2.departamento_id = d1.pai_level_2_id
      LEFT JOIN %I.departments_level_3 d3 
        ON d3.departamento_id = d1.pai_level_3_id
      WHERE v.data_venda >= $1
        AND v.data_venda < $2
        AND v.valor_vendas > 0
        AND ($3 IS NULL OR v.filial_id = $3)
      GROUP BY 
        d3.descricao,
        d2.descricao,
        d1.descricao,
        p.id,
        p.descricao,
        v.filial_id,
        p.curva_abcd,
        p.curva_lucro
    ),
    dept3_totais AS (
      -- Calculate department level 3 totals from aggregated data (no additional table scan)
      SELECT 
        dept3_nome,
        SUM(total_valor_vendas) as total_vendas
      FROM vendas_agregadas
      GROUP BY dept3_nome
      ORDER BY total_vendas DESC
      LIMIT $4 OFFSET $5
    )
    SELECT 
      va.dept3_nome::text,
      va.dept2_nome::text,
      va.dept1_nome::text,
      va.produto_id,
      va.produto_nome::text,
      va.filial_id,
      ROUND(va.total_qtde::numeric, 2),
      ROUND(va.total_valor_vendas::numeric, 2),
      ROUND(va.total_lucro::numeric, 2),
      CASE 
        WHEN va.total_valor_vendas > 0 
        THEN ROUND((va.total_lucro / va.total_valor_vendas) * 100, 2)
        ELSE 0 
      END as percentual_lucro,
      va.curva_venda::text,
      va.curva_lucro::text
    FROM vendas_agregadas va
    INNER JOIN dept3_totais dt ON va.dept3_nome = dt.dept3_nome
    ORDER BY 
      va.dept3_nome,
      va.dept2_nome,
      va.dept1_nome,
      CASE va.curva_venda
        WHEN ''A'' THEN 1 
        WHEN ''B'' THEN 2 
        WHEN ''C'' THEN 3 
        WHEN ''D'' THEN 4 
        ELSE 5 
      END,
      va.total_valor_vendas DESC
  ', p_schema, p_schema, p_schema, p_schema, p_schema)
  USING v_data_inicio, v_data_fim, p_filial_id, p_page_size, v_offset;
  
END;
$$;

-- Step 3: Add comment
COMMENT ON FUNCTION get_venda_curva_report IS 
'Optimized function for Venda por Curva report. 
Uses single table scan with CTEs to avoid performance issues.
Includes date range optimization for better index usage.
Created: 2025-10-21';

