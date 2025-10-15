-- Migration: Versão simplificada e funcional do relatório de ruptura ABCD

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
  filial_id BIGINT,
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
  v_sql TEXT;
BEGIN
  -- Calcular offset
  v_offset := (p_page - 1) * p_page_size;

  -- Query completa com CTE
  v_sql := format($sql$
    WITH filtered_produtos AS (
      SELECT 
        p.id,
        p.filial_id,
        p.descricao,
        p.curva_lucro,
        p.curva_abcd,
        p.estoque_atual,
        p.venda_media_diaria_60d,
        p.dias_de_estoque,
        p.preco_de_venda_1,
        p.departamento_id
      FROM %I.produtos p
      WHERE 1=1
        AND (CASE WHEN $1 IS NULL THEN TRUE ELSE p.filial_id = $1 END)
        AND (CASE WHEN $2 = TRUE THEN p.ativo = TRUE ELSE TRUE END)
        AND (CASE WHEN $3 = TRUE THEN p.estoque_atual <= 0 ELSE TRUE END)
        AND p.curva_abcd = ANY($4)
        AND (CASE WHEN $5 IS NULL THEN TRUE ELSE p.departamento_id = $5 END)
        AND (CASE WHEN $6 IS NULL OR $6 = '' THEN TRUE ELSE p.descricao ILIKE '%%' || $6 || '%%' END)
    ),
    with_total AS (
      SELECT COUNT(*) as total FROM filtered_produtos
    )
    SELECT 
      (SELECT total FROM with_total) as total_records,
      COALESCE(d.departamento_id, 0) as departamento_id,
      COALESCE(d.descricao, 'SEM DEPARTAMENTO') as departamento_nome,
      fp.id as produto_id,
      fp.filial_id,
      fp.descricao as produto_descricao,
      fp.curva_lucro,
      fp.curva_abcd as curva_venda,
      fp.estoque_atual,
      fp.venda_media_diaria_60d,
      fp.dias_de_estoque,
      fp.preco_de_venda_1 as preco_venda
    FROM filtered_produtos fp
    LEFT JOIN %I.departments_level_1 d ON fp.departamento_id = d.departamento_id
    ORDER BY 
      COALESCE(d.descricao, 'SEM DEPARTAMENTO'),
      fp.curva_abcd,
      fp.estoque_atual,
      fp.venda_media_diaria_60d DESC
    LIMIT $7 OFFSET $8
  $sql$, p_schema, p_schema);

  -- Executar e retornar
  RETURN QUERY EXECUTE v_sql
  USING p_filial_id, p_apenas_ativos, p_apenas_ruptura, p_curvas, p_departamento_id, p_busca, p_page_size, v_offset;
END;
$$;

COMMENT ON FUNCTION get_ruptura_abcd_report IS 'Relatório de ruptura por curva ABCD - versão simplificada';
