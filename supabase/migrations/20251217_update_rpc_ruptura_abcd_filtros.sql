-- ============================================================================
-- RPC: get_ruptura_abcd_report (ATUALIZADA)
-- ============================================================================
-- Data: 2025-12-17
-- Descricao: Atualiza RPC para suportar:
--   - p_filial_ids (array em vez de único)
--   - p_departamento_ids (array em vez de único)
--   - p_setor_ids (NOVO - filtro por setores)
-- ============================================================================

-- Dropar versões anteriores com assinaturas diferentes
DROP FUNCTION IF EXISTS public.get_ruptura_abcd_report(text, bigint, text[], boolean, boolean, bigint, text, integer, integer);
DROP FUNCTION IF EXISTS public.get_ruptura_abcd_report(text, bigint[], text[], boolean, boolean, bigint[], bigint[], text, integer, integer);

CREATE OR REPLACE FUNCTION public.get_ruptura_abcd_report(
  p_schema text,
  p_filial_ids bigint[] DEFAULT NULL,
  p_curvas text[] DEFAULT ARRAY['A', 'B'],
  p_apenas_ativos boolean DEFAULT true,
  p_apenas_ruptura boolean DEFAULT true,
  p_departamento_ids bigint[] DEFAULT NULL,
  p_setor_ids bigint[] DEFAULT NULL,
  p_busca text DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 50
)
RETURNS TABLE(
  total_records bigint,
  departamento_id bigint,
  departamento_nome text,
  produto_id bigint,
  filial_id bigint,
  filial_nome text,
  produto_descricao text,
  curva_lucro character varying,
  curva_venda text,
  estoque_atual numeric,
  venda_media_diaria_60d numeric,
  dias_de_estoque numeric,
  preco_venda numeric,
  filial_transfer_id bigint,
  filial_transfer_nome text,
  estoque_transfer numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout TO '60s'
AS $$
DECLARE
  v_offset INTEGER;
  v_sql TEXT;
  v_setor_dept_ids bigint[];
  v_final_dept_ids bigint[];
BEGIN
  v_offset := (p_page - 1) * p_page_size;

  -- ============================================================================
  -- Se filtro por setores, buscar os departamento_ids de nível 1 correspondentes
  -- ============================================================================
  IF p_setor_ids IS NOT NULL THEN
    EXECUTE format('
      SELECT ARRAY_AGG(DISTINCT dl1.departamento_id)
      FROM %I.setores s
      CROSS JOIN LATERAL (
        SELECT dl1.departamento_id
        FROM %I.departments_level_1 dl1
        WHERE
          (s.departamento_nivel = 1 AND dl1.departamento_id = ANY(s.departamento_ids))
          OR (s.departamento_nivel = 2 AND dl1.pai_level_2_id = ANY(s.departamento_ids))
          OR (s.departamento_nivel = 3 AND dl1.pai_level_3_id = ANY(s.departamento_ids))
          OR (s.departamento_nivel = 4 AND dl1.pai_level_4_id = ANY(s.departamento_ids))
          OR (s.departamento_nivel = 5 AND dl1.pai_level_5_id = ANY(s.departamento_ids))
          OR (s.departamento_nivel = 6 AND dl1.pai_level_6_id = ANY(s.departamento_ids))
      ) dl1
      WHERE s.id = ANY($1) AND s.ativo = true
    ', p_schema, p_schema)
    INTO v_setor_dept_ids
    USING p_setor_ids;
  END IF;

  -- Combinar filtros de departamento (se ambos fornecidos, usar interseção)
  IF p_departamento_ids IS NOT NULL AND v_setor_dept_ids IS NOT NULL THEN
    -- Interseção: apenas departamentos que estão em ambos
    SELECT ARRAY_AGG(d)
    FROM unnest(p_departamento_ids) d
    WHERE d = ANY(v_setor_dept_ids)
    INTO v_final_dept_ids;
  ELSIF v_setor_dept_ids IS NOT NULL THEN
    v_final_dept_ids := v_setor_dept_ids;
  ELSE
    v_final_dept_ids := p_departamento_ids;
  END IF;

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
        AND (CASE WHEN $1 IS NULL THEN TRUE ELSE p.filial_id = ANY($1) END)
        AND (CASE WHEN $2 = TRUE THEN p.ativo = TRUE ELSE TRUE END)
        AND (CASE WHEN $3 = TRUE THEN p.estoque_atual <= 0 ELSE TRUE END)
        AND p.curva_abcd = ANY($4)
        AND (CASE WHEN $5 IS NULL THEN TRUE ELSE p.departamento_id = ANY($5) END)
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
  USING p_filial_ids, p_apenas_ativos, p_apenas_ruptura, p_curvas, v_final_dept_ids, p_busca, p_page_size, v_offset;
END;
$$;

COMMENT ON FUNCTION public.get_ruptura_abcd_report IS
'Retorna produtos em ruptura (estoque <= 0) para análise ABCD.

PARAMETROS:
- p_schema: Schema do tenant (ex: okilao, lucia, paraiso)
- p_filial_ids: Array de IDs de filiais (NULL = todas)
- p_curvas: Array de curvas ABCD a filtrar (default: A,B)
- p_apenas_ativos: Se true, apenas produtos ativos (default: true)
- p_apenas_ruptura: Se true, apenas estoque <= 0 (default: true)
- p_departamento_ids: Array de IDs de departamentos a filtrar (NULL = todos)
- p_setor_ids: Array de IDs de setores a filtrar (NULL = todos). Filtra produtos pelos departamentos associados aos setores.
- p_busca: Texto para buscar na descrição do produto (default: NULL)
- p_page: Pagina atual (default: 1)
- p_page_size: Itens por pagina (default: 50)

RETORNO:
Tabela com colunas: total_records, departamento_id, departamento_nome, produto_id,
filial_id, filial_nome, produto_descricao, curva_lucro, curva_venda, estoque_atual,
venda_media_diaria_60d, dias_de_estoque, preco_venda, filial_transfer_id,
filial_transfer_nome, estoque_transfer

EXEMPLO:
SELECT * FROM public.get_ruptura_abcd_report(
  ''lucia'',
  ARRAY[1, 2],
  ARRAY[''A'',''B'',''C''],
  true,
  true,
  NULL,
  ARRAY[13, 14, 15],
  NULL,
  1,
  50
);';
