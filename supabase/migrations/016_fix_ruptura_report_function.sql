-- Migration: Corrigir função de relatório de ruptura ABCD
-- Fix: Simplificar lógica de filtros para melhor clareza

DROP FUNCTION IF EXISTS get_ruptura_abcd_report(TEXT, BIGINT, TEXT[], BOOLEAN, BOOLEAN, BIGINT, TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_ruptura_abcd_report(
  p_schema TEXT,
  p_filial_id BIGINT DEFAULT NULL,
  p_curvas TEXT[] DEFAULT ARRAY['A', 'B'],
  p_apenas_ativos BOOLEAN DEFAULT TRUE,
  p_apenas_ruptura BOOLEAN DEFAULT TRUE,
  p_departamento_id BIGINT DEFAULT NULL,
  p_busca TEXT DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 50
)
RETURNS TABLE(
  total_records BIGINT,
  departamento_id BIGINT,
  departamento_nome TEXT,
  produto_id BIGINT,
  produto_descricao TEXT,
  curva_lucro VARCHAR(2),
  curva_venda TEXT,
  estoque_atual NUMERIC(18, 6),
  venda_media_diaria_60d NUMERIC(15, 5),
  dias_de_estoque NUMERIC(10, 2),
  preco_venda NUMERIC(15, 5)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offset INTEGER;
  v_total BIGINT;
  v_query TEXT;
  v_count_query TEXT;
BEGIN
  -- Calcular offset para paginação
  v_offset := (p_page - 1) * p_page_size;

  -- Construir WHERE clause
  v_count_query := format(
    'SELECT COUNT(*) FROM %I.produtos p WHERE 1=1',
    p_schema
  );
  
  v_query := format(
    'SELECT 
      COALESCE(d.departamento_id, 0) as departamento_id,
      COALESCE(d.descricao, ''SEM DEPARTAMENTO'') as departamento_nome,
      p.id as produto_id,
      p.descricao as produto_descricao,
      p.curva_lucro,
      p.curva_abcd as curva_venda,
      p.estoque_atual,
      p.venda_media_diaria_60d,
      p.dias_de_estoque,
      p.preco_de_venda_1 as preco_venda
    FROM %I.produtos p
    LEFT JOIN %I.departments_level_1 d ON p.departamento_id = d.departamento_id
    WHERE 1=1',
    p_schema, p_schema
  );

  -- Adicionar filtros dinamicamente
  IF p_filial_id IS NOT NULL THEN
    v_count_query := v_count_query || format(' AND p.filial_id = %L', p_filial_id);
    v_query := v_query || format(' AND p.filial_id = %L', p_filial_id);
  END IF;

  IF p_apenas_ativos THEN
    v_count_query := v_count_query || ' AND p.ativo = true';
    v_query := v_query || ' AND p.ativo = true';
  END IF;

  IF p_apenas_ruptura THEN
    v_count_query := v_count_query || ' AND p.estoque_atual <= 0';
    v_query := v_query || ' AND p.estoque_atual <= 0';
  END IF;

  IF p_curvas IS NOT NULL AND array_length(p_curvas, 1) > 0 THEN
    v_count_query := v_count_query || format(' AND p.curva_abcd = ANY(ARRAY[%s])', 
      (SELECT string_agg(quote_literal(c), ',') FROM unnest(p_curvas) AS c));
    v_query := v_query || format(' AND p.curva_abcd = ANY(ARRAY[%s])', 
      (SELECT string_agg(quote_literal(c), ',') FROM unnest(p_curvas) AS c));
  END IF;

  IF p_departamento_id IS NOT NULL THEN
    v_count_query := v_count_query || format(' AND p.departamento_id = %L', p_departamento_id);
    v_query := v_query || format(' AND p.departamento_id = %L', p_departamento_id);
  END IF;

  IF p_busca IS NOT NULL AND p_busca != '' THEN
    v_count_query := v_count_query || format(' AND p.descricao ILIKE ''%%%s%%''', p_busca);
    v_query := v_query || format(' AND p.descricao ILIKE ''%%%s%%''', p_busca);
  END IF;

  -- Executar contagem
  EXECUTE v_count_query INTO v_total;

  -- Adicionar ORDER BY e LIMIT
  v_query := v_query || format('
    ORDER BY 
      COALESCE(d.descricao, ''SEM DEPARTAMENTO''),
      p.curva_abcd,
      p.estoque_atual,
      p.venda_media_diaria_60d DESC
    LIMIT %L OFFSET %L',
    p_page_size, v_offset
  );

  -- Retornar resultados
  RETURN QUERY EXECUTE format(
    'SELECT %L::BIGINT as total_records, * FROM (%s) subq',
    v_total, v_query
  );
END;
$$;

COMMENT ON FUNCTION get_ruptura_abcd_report IS 'Relatório de ruptura por curva ABCD com paginação e filtros performáticos - versão corrigida';
