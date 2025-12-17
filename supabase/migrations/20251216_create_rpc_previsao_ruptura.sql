-- ============================================================================
-- RPC: get_previsao_ruptura_report
-- ============================================================================
-- Data: 2025-12-16
-- Atualizado: 2025-12-17 - Adicionado filtro por setores (p_setor_ids)
-- Descricao: Retorna produtos em risco de ruptura com base nos dias de estoque
-- ============================================================================

-- Dropar funções antigas (assinaturas diferentes)
DROP FUNCTION IF EXISTS public.get_previsao_ruptura_report(text, bigint[], integer, text[], boolean, integer, integer);
DROP FUNCTION IF EXISTS public.get_previsao_ruptura_report(text, bigint[], integer, integer, text[], boolean, integer, integer);
DROP FUNCTION IF EXISTS public.get_previsao_ruptura_report(text, bigint[], integer, integer, text[], boolean, text, integer, integer);
DROP FUNCTION IF EXISTS public.get_previsao_ruptura_report(text, bigint[], integer, integer, text[], boolean, text, text, integer, integer);
DROP FUNCTION IF EXISTS public.get_previsao_ruptura_report(text, bigint[], integer, integer, text[], boolean, text, text, bigint[], integer, integer);

CREATE OR REPLACE FUNCTION public.get_previsao_ruptura_report(
  p_schema text,
  p_filial_ids bigint[] DEFAULT NULL,
  p_dias_min integer DEFAULT 1,
  p_dias_max integer DEFAULT 7,
  p_curvas text[] DEFAULT ARRAY['A','B','C'],
  p_apenas_ativos boolean DEFAULT true,
  p_busca text DEFAULT NULL,
  p_tipo_busca text DEFAULT 'produto',
  p_departamento_ids bigint[] DEFAULT NULL,
  p_setor_ids bigint[] DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout TO '60s'
AS $$
DECLARE
  v_offset integer;
  v_total_records integer;
  v_produtos jsonb;
  v_query text;
  v_count_query text;
  v_busca_pattern text;
  v_setor_dept_ids bigint[];
BEGIN
  -- Calcular offset
  v_offset := (p_page - 1) * p_page_size;

  -- Preparar pattern de busca
  v_busca_pattern := CASE WHEN p_busca IS NOT NULL AND p_busca <> ''
                          THEN '%' || UPPER(p_busca) || '%'
                          ELSE NULL
                     END;

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

  -- ============================================================================
  -- Query para contar total de registros
  -- ============================================================================
  v_count_query := format('
    SELECT COUNT(*)
    FROM %I.produtos p
    LEFT JOIN %I.departments_level_1 d ON d.departamento_id = p.departamento_id
    WHERE
      COALESCE(p.estoque_atual, 0) >= 1
      AND COALESCE(p.venda_media_diaria_60d, 0) > 0
      AND COALESCE(p.dias_de_estoque, 0) > 0
      AND p.dias_de_estoque >= $1
      AND p.dias_de_estoque <= $2
      AND p.curva_abcd = ANY($3)
      AND ($4 = false OR p.ativo = true)
      AND ($5 IS NULL OR p.filial_id = ANY($5))
      AND (
        $6 IS NULL
        OR (
          CASE WHEN $7 = ''departamento''
            THEN UPPER(COALESCE(d.descricao, '''')) LIKE $6
            ELSE UPPER(p.descricao) LIKE $6
          END
        )
      )
      AND ($8 IS NULL OR p.departamento_id = ANY($8))
      AND ($9 IS NULL OR p.departamento_id = ANY($9))
  ', p_schema, p_schema);

  EXECUTE v_count_query
  INTO v_total_records
  USING p_dias_min, p_dias_max, p_curvas, p_apenas_ativos, p_filial_ids, v_busca_pattern, p_tipo_busca, p_departamento_ids, v_setor_dept_ids;

  -- ============================================================================
  -- Query principal para buscar produtos
  -- ============================================================================
  v_query := format('
    SELECT jsonb_agg(row_to_json(t))
    FROM (
      SELECT
        p.id,
        p.descricao,
        p.filial_id,
        COALESCE(b.descricao, ''Filial '' || p.filial_id) AS filial_nome,
        COALESCE(p.departamento_id, 0) AS departamento_id,
        COALESCE(d.descricao, ''SEM DEPARTAMENTO'') AS departamento_nome,
        p.curva_abcd,
        ROUND(p.estoque_atual::numeric, 2) AS estoque_atual,
        ROUND(p.venda_media_diaria_60d::numeric, 2) AS venda_media_diaria_60d,
        ROUND(p.dias_de_estoque::numeric, 1) AS dias_de_estoque,
        (CURRENT_DATE + p.dias_de_estoque::integer)::date AS previsao_ruptura
      FROM %I.produtos p
      LEFT JOIN public.branches b
        ON b.branch_code = p.filial_id::text
        AND b.tenant_id = (SELECT id FROM public.tenants WHERE supabase_schema = %L LIMIT 1)
      LEFT JOIN %I.departments_level_1 d ON d.departamento_id = p.departamento_id
      WHERE
        COALESCE(p.estoque_atual, 0) >= 1
        AND COALESCE(p.venda_media_diaria_60d, 0) > 0
        AND COALESCE(p.dias_de_estoque, 0) > 0
        AND p.dias_de_estoque >= $1
        AND p.dias_de_estoque <= $2
        AND p.curva_abcd = ANY($3)
        AND ($4 = false OR p.ativo = true)
        AND ($5 IS NULL OR p.filial_id = ANY($5))
        AND (
          $6 IS NULL
          OR (
            CASE WHEN $7 = ''departamento''
              THEN UPPER(COALESCE(d.descricao, '''')) LIKE $6
              ELSE UPPER(p.descricao) LIKE $6
            END
          )
        )
        AND ($8 IS NULL OR p.departamento_id = ANY($8))
        AND ($9 IS NULL OR p.departamento_id = ANY($9))
      ORDER BY
        COALESCE(d.descricao, ''ZZZ SEM DEPARTAMENTO'') ASC,
        p.dias_de_estoque ASC,
        p.curva_abcd ASC
      LIMIT $10 OFFSET $11
    ) t
  ', p_schema, p_schema, p_schema);

  EXECUTE v_query
  INTO v_produtos
  USING p_dias_min, p_dias_max, p_curvas, p_apenas_ativos, p_filial_ids, v_busca_pattern, p_tipo_busca, p_departamento_ids, v_setor_dept_ids, p_page_size, v_offset;

  -- ============================================================================
  -- Retornar resultado
  -- ============================================================================
  RETURN jsonb_build_object(
    'total_records', COALESCE(v_total_records, 0),
    'page', p_page,
    'page_size', p_page_size,
    'total_pages', CEIL(COALESCE(v_total_records, 0)::numeric / p_page_size),
    'produtos', COALESCE(v_produtos, '[]'::jsonb)
  );
END;
$$;

COMMENT ON FUNCTION public.get_previsao_ruptura_report IS
'Retorna produtos em risco de ruptura com base nos dias de estoque.

PARAMETROS:
- p_schema: Schema do tenant (ex: okilao, lucia, paraiso)
- p_filial_ids: Array de IDs de filiais (NULL = todas)
- p_dias_min: Filtrar produtos com dias_de_estoque >= este valor (default: 1)
- p_dias_max: Filtrar produtos com dias_de_estoque <= este valor (default: 7)
- p_curvas: Array de curvas ABCD a filtrar (default: A,B,C)
- p_apenas_ativos: Se true, apenas produtos ativos (default: true)
- p_busca: Texto para buscar (default: NULL)
- p_tipo_busca: Tipo de busca: ''produto'' ou ''departamento'' (default: produto)
- p_departamento_ids: Array de IDs de departamentos a filtrar (NULL = todos)
- p_setor_ids: Array de IDs de setores a filtrar (NULL = todos). Filtra produtos pelos departamentos associados aos setores.
- p_page: Pagina atual (default: 1)
- p_page_size: Itens por pagina (default: 50)

RETORNO:
{
  "total_records": integer,
  "page": integer,
  "page_size": integer,
  "total_pages": integer,
  "produtos": [...]
}

EXEMPLO - Por produto:
SELECT public.get_previsao_ruptura_report(
  ''lucia'',
  NULL,
  1,
  7,
  ARRAY[''A'',''B'',''C''],
  true,
  ''ARROZ'',
  ''produto'',
  NULL,
  NULL,
  1,
  50
);

EXEMPLO - Por setores:
SELECT public.get_previsao_ruptura_report(
  ''lucia'',
  NULL,
  1,
  7,
  ARRAY[''A'',''B'',''C''],
  true,
  NULL,
  ''produto'',
  NULL,
  ARRAY[13, 14, 15],
  1,
  50
);';
