-- ============================================
-- Migration 045: Corrigir tipo de filial_nome no relatório de ruptura ABCD
-- ============================================
-- Data: 2025-10-16
-- Descrição: Corrige o tipo de retorno de filial_nome para TEXT (branches.descricao é VARCHAR)
--            e corrige o JOIN usando branches.id (UUID) comparado com produtos.filial_id (BIGINT)

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
  filial_nome TEXT,
  produto_descricao TEXT,
  curva_lucro VARCHAR(2),
  curva_venda TEXT,
  estoque_atual NUMERIC(18, 6),
  venda_media_diaria_60d NUMERIC(15, 5),
  dias_de_estoque NUMERIC(10, 2),
  preco_venda NUMERIC(15, 5),
  filial_transfer_id BIGINT,
  filial_transfer_nome TEXT,
  estoque_transfer NUMERIC(18, 6)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offset INTEGER;
  v_sql TEXT;
BEGIN
  v_offset := (p_page - 1) * p_page_size;

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
    ),
    tenant_info AS (
      SELECT tenant_id FROM branches LIMIT 1
    ),
    with_transfer_all AS (
      SELECT 
        p.id as produto_origem_id,
        p.filial_id as filial_origem_id,
        pt.filial_id as filial_transfer_id,
        COALESCE(f.descricao::TEXT, 'Filial ' || pt.filial_id::TEXT) as filial_transfer_nome,
        pt.estoque_atual as estoque_transfer,
        ROW_NUMBER() OVER (PARTITION BY p.id, p.filial_id ORDER BY pt.estoque_atual DESC, pt.filial_id ASC) as rn
      FROM filtered_produtos p
      INNER JOIN %I.produtos pt 
        ON p.id = pt.id 
        AND pt.filial_id != p.filial_id
        AND pt.estoque_atual > 0
      LEFT JOIN branches f 
        ON pt.filial_id::TEXT = f.branch_code
        AND f.tenant_id = (SELECT tenant_id FROM tenant_info)
    ),
    with_transfer AS (
      SELECT 
        produto_origem_id,
        filial_origem_id,
        filial_transfer_id,
        filial_transfer_nome,
        estoque_transfer
      FROM with_transfer_all
      WHERE rn = 1
    )
    SELECT 
      (SELECT total FROM with_total) as total_records,
      COALESCE(d.departamento_id, 0) as departamento_id,
      COALESCE(d.descricao, 'SEM DEPARTAMENTO') as departamento_nome,
      fp.id as produto_id,
      fp.filial_id,
      COALESCE(b.descricao::TEXT, 'Filial ' || fp.filial_id::TEXT) as filial_nome,
      fp.descricao as produto_descricao,
      fp.curva_lucro,
      fp.curva_abcd as curva_venda,
      fp.estoque_atual,
      fp.venda_media_diaria_60d,
      fp.dias_de_estoque,
      fp.preco_de_venda_1 as preco_venda,
      wt.filial_transfer_id,
      wt.filial_transfer_nome,
      wt.estoque_transfer
    FROM filtered_produtos fp
    LEFT JOIN %I.departments_level_1 d ON fp.departamento_id = d.departamento_id
    LEFT JOIN branches b 
      ON fp.filial_id::TEXT = b.branch_code
      AND b.tenant_id = (SELECT tenant_id FROM tenant_info)
    LEFT JOIN with_transfer wt 
      ON fp.id = wt.produto_origem_id 
      AND fp.filial_id = wt.filial_origem_id
    ORDER BY 
      COALESCE(d.descricao, 'ZZZZZ_SEM DEPARTAMENTO') ASC,
      COALESCE(b.descricao, 'ZZZZ_Filial ' || fp.filial_id::TEXT) ASC,
      fp.descricao ASC
    LIMIT $7 OFFSET $8
  $sql$, p_schema, p_schema, p_schema);

  RETURN QUERY EXECUTE v_sql
  USING p_filial_id, p_apenas_ativos, p_apenas_ruptura, p_curvas, p_departamento_id, p_busca, p_page_size, v_offset;
END;
$$;

COMMENT ON FUNCTION get_ruptura_abcd_report IS 'Relatório de ruptura por curva ABCD com suporte a múltiplas filiais - JOIN corrigido usando branch_code e cast de VARCHAR para TEXT';
