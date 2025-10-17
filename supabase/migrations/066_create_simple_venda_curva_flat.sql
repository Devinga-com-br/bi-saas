-- Drop existing function if exists
DROP FUNCTION IF EXISTS get_venda_curva_report(text, integer, integer, bigint, integer, integer);

-- Create function that returns simple flat data
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
BEGIN
  v_offset := (p_page - 1) * p_page_size;
  
  RETURN QUERY EXECUTE format('
    SELECT 
      COALESCE(d3.descricao, ''Sem Nível 3'')::text as dept_nivel3,
      COALESCE(d2.descricao, ''Sem Nível 2'')::text as dept_nivel2,
      d1.descricao::text as dept_nivel1,
      p.id as produto_codigo,
      p.descricao::text as produto_descricao,
      v.filial_id,
      ROUND(SUM(v.quantidade)::numeric, 2) as qtde,
      ROUND(SUM(v.valor_vendas)::numeric, 2) as valor_vendas,
      ROUND(SUM(COALESCE(v.valor_vendas, 0) - (COALESCE(v.custo_compra, 0) * COALESCE(v.quantidade, 0)))::numeric, 2) as valor_lucro,
      CASE 
        WHEN SUM(v.valor_vendas) > 0 
        THEN ROUND((SUM(COALESCE(v.valor_vendas, 0) - (COALESCE(v.custo_compra, 0) * COALESCE(v.quantidade, 0))) / SUM(v.valor_vendas)) * 100, 2)
        ELSE 0 
      END as percentual_lucro,
      COALESCE(p.curva_abcd, ''D'')::text as curva_venda,
      COALESCE(p.curva_lucro, ''D'')::text as curva_lucro
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
    GROUP BY 
      d3.descricao,
      d2.descricao,
      d1.descricao,
      p.id, p.descricao,
      v.filial_id, p.curva_abcd, p.curva_lucro
    ORDER BY 
      COALESCE(d3.descricao, ''Sem Nível 3''),
      SUM(v.valor_vendas) DESC
    LIMIT $4 OFFSET $5
  ', p_schema, p_schema, p_schema, p_schema, p_schema)
  USING p_mes, p_ano, p_filial_id, p_page_size, v_offset;
  
END;
$$;
