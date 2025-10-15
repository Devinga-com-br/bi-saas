-- Migration: Criar função para relatório de ruptura por curva ABCD
-- 
-- Esta função retorna produtos com ruptura de estoque agrupados por departamento
-- com suporte a paginação e filtros performáticos

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
BEGIN
  -- Calcular offset para paginação
  v_offset := (p_page - 1) * p_page_size;

  -- Contar total de registros (para paginação)
  EXECUTE format(
    $q$
    SELECT COUNT(*)
    FROM %I.produtos p
    LEFT JOIN %I.departments_level_1 d ON p.departamento_id = d.departamento_id
    WHERE 1=1
      AND ($1 IS NULL OR p.filial_id = $1)
      AND ($2 OR p.ativo = true)
      AND ($3 OR p.estoque_atual <= 0)
      AND (p.curva_abcd = ANY($4))
      AND ($5 IS NULL OR p.departamento_id = $5)
      AND ($6 IS NULL OR p.descricao ILIKE '%%' || $6 || '%%')
    $q$,
    p_schema, p_schema
  ) INTO v_total
  USING p_filial_id, NOT p_apenas_ativos, NOT p_apenas_ruptura, p_curvas, p_departamento_id, p_busca;

  -- Retornar dados paginados e ordenados por departamento e curva
  RETURN QUERY EXECUTE format(
    $q$
    SELECT
      $1::BIGINT as total_records,
      COALESCE(d.departamento_id, 0) as departamento_id,
      COALESCE(d.descricao, 'SEM DEPARTAMENTO') as departamento_nome,
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
    WHERE 1=1
      AND ($2 IS NULL OR p.filial_id = $2)
      AND ($3 OR p.ativo = true)
      AND ($4 OR p.estoque_atual <= 0)
      AND (p.curva_abcd = ANY($5))
      AND ($6 IS NULL OR p.departamento_id = $6)
      AND ($7 IS NULL OR p.descricao ILIKE '%%' || $7 || '%%')
    ORDER BY 
      COALESCE(d.descricao, 'SEM DEPARTAMENTO'),
      p.curva_abcd,
      p.estoque_atual,
      p.venda_media_diaria_60d DESC
    LIMIT $8 OFFSET $9
    $q$,
    p_schema, p_schema
  )
  USING v_total, p_filial_id, NOT p_apenas_ativos, NOT p_apenas_ruptura, p_curvas, p_departamento_id, p_busca, p_page_size, v_offset;
END;
$$;

-- Comentários sobre a função
COMMENT ON FUNCTION get_ruptura_abcd_report IS 'Relatório de ruptura por curva ABCD com paginação e filtros performáticos';
