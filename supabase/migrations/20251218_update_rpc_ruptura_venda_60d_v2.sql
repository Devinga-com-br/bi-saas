-- ============================================================================
-- RPC: get_ruptura_venda_60d_report (v2 - Lógica Flexível)
-- Relatório: Ruptura Vendas - Dias sem Giro
-- ============================================================================
-- Data: 2025-12-18
-- Versão: 2.0 - Critérios configuráveis
-- ============================================================================
--
-- MUDANÇAS DA V1 PARA V2:
-- -----------------------
-- 1. p_limite_minimo_dias agora é UTILIZADO (>= em vez de = 60)
-- 2. Novo parâmetro p_curvas para filtrar curvas ABCD
-- 3. nivel_ruptura calculado dinamicamente (não mais fixo em CRÍTICO)
-- 4. Ordenação por nível de ruptura + venda média
--
-- CONCEITO DE NEGÓCIO:
-- --------------------
-- "Dias sem Giro" - Identifica produtos que:
--   1. Tinham demanda consistente (venderam em >= X dias dos últimos 60)
--   2. PARARAM de girar nos últimos 3 dias
--   3. TÊM estoque disponível
--   4. São de curvas relevantes (A, B, C por padrão)
--
-- ============================================================================

-- Dropar versões anteriores
DROP FUNCTION IF EXISTS public.get_ruptura_venda_60d_report(text, integer[], integer, integer, integer);
DROP FUNCTION IF EXISTS public.get_ruptura_venda_60d_report(text, integer[], integer, text[], integer, integer);

CREATE OR REPLACE FUNCTION public.get_ruptura_venda_60d_report(
  schema_name text,
  p_filiais integer[] DEFAULT NULL::integer[],
  p_limite_minimo_dias integer DEFAULT 20,      -- Mínimo de dias com venda nos 60d
  p_curvas text[] DEFAULT ARRAY['A','B','C'],   -- Curvas a filtrar
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 50
)
RETURNS TABLE (
  total_records bigint,
  page integer,
  page_size integer,
  total_pages integer,
  segmentos json
)
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout TO '120s'
AS $function$
DECLARE
  v_offset integer;
  v_total_records bigint;
  v_total_pages integer;
  v_query text;
  v_count_query text;
  v_result json;
BEGIN
  -- ============================================================================
  -- VALIDAÇÃO DE ENTRADA
  -- ============================================================================
  IF schema_name IS NULL OR schema_name = '' THEN
    RAISE EXCEPTION 'schema_name não pode ser nulo ou vazio';
  END IF;

  -- Calcular offset para paginação
  v_offset := (p_page - 1) * p_page_size;

  -- ============================================================================
  -- QUERY DE CONTAGEM
  -- ============================================================================
  v_count_query := format('
    SELECT COUNT(*)
    FROM %I.produtos p
    WHERE
      COALESCE(p.dias_com_venda_60d, 0) >= $1
      AND COALESCE(p.dias_com_venda_ultimos_3d, 0) = 0
      AND COALESCE(p.estoque_atual, 0) > 0
      AND ($2 IS NULL OR p.curva_abcd = ANY($2))
      %s
  ',
    schema_name,
    CASE
      WHEN p_filiais IS NOT NULL AND array_length(p_filiais, 1) > 0
      THEN 'AND p.filial_id = ANY($3)'
      ELSE ''
    END
  );

  -- Executar contagem
  IF p_filiais IS NOT NULL AND array_length(p_filiais, 1) > 0 THEN
    EXECUTE v_count_query INTO v_total_records USING p_limite_minimo_dias, p_curvas, p_filiais;
  ELSE
    EXECUTE v_count_query INTO v_total_records USING p_limite_minimo_dias, p_curvas;
  END IF;

  -- Calcular total de páginas
  v_total_pages := GREATEST(CEIL(COALESCE(v_total_records, 0)::numeric / p_page_size), 1);

  -- ============================================================================
  -- QUERY PRINCIPAL
  -- ============================================================================
  v_query := format('
    WITH produtos_ruptura AS (
      SELECT
        p.id as produto_id,
        p.filial_id,
        COALESCE(b.descricao, ''Filial '' || p.filial_id) as filial_nome,
        COALESCE(p.descricao, ''Sem Descrição'') as produto_nome,
        COALESCE(d3.descricao, ''Sem Categoria'') as segmento,
        COALESCE(d2.descricao, ''Sem Grupo'') as grupo,
        COALESCE(d1.descricao, ''Sem Subgrupo'') as subgrupo,
        COALESCE(p.curva_abcd, ''N/A'') as curva_abcd,
        COALESCE(p.dias_com_venda_60d, 0) as dias_com_venda_60d,
        COALESCE(p.dias_com_venda_ultimos_3d, 0) as dias_com_venda_ultimos_3d,
        COALESCE(p.estoque_atual, 0) as estoque_atual,
        COALESCE(p.venda_media_diaria_60d, 0) as venda_media_diaria_60d,
        (COALESCE(p.estoque_atual, 0) * COALESCE(p.preco_de_custo, 0)) as valor_estoque_parado,
        -- Cálculo dinâmico do nível de ruptura
        CASE
          WHEN p.dias_com_venda_60d >= 50 AND p.curva_abcd = ''A'' THEN ''CRÍTICO''
          WHEN p.dias_com_venda_60d >= 40 AND p.curva_abcd IN (''A'', ''B'') THEN ''ALTO''
          WHEN p.dias_com_venda_60d >= 30 THEN ''MÉDIO''
          WHEN p.dias_com_venda_60d >= 20 THEN ''BAIXO''
          ELSE ''NORMAL''
        END as nivel_ruptura,
        -- Score para ordenação (quanto maior, mais crítico)
        CASE
          WHEN p.dias_com_venda_60d >= 50 AND p.curva_abcd = ''A'' THEN 5
          WHEN p.dias_com_venda_60d >= 40 AND p.curva_abcd IN (''A'', ''B'') THEN 4
          WHEN p.dias_com_venda_60d >= 30 THEN 3
          WHEN p.dias_com_venda_60d >= 20 THEN 2
          ELSE 1
        END as nivel_score
      FROM %I.produtos p
      LEFT JOIN %I.departments_level_1 d1 ON d1.departamento_id = p.departamento_id
      LEFT JOIN %I.departments_level_2 d2 ON d2.departamento_id = d1.pai_level_2_id
      LEFT JOIN %I.departments_level_3 d3 ON d3.departamento_id = d2.pai_level_3_id
      LEFT JOIN public.branches b
        ON b.branch_code = p.filial_id::text
        AND b.tenant_id = (SELECT id FROM public.tenants WHERE supabase_schema = %L LIMIT 1)
      WHERE
        COALESCE(p.dias_com_venda_60d, 0) >= $1
        AND COALESCE(p.dias_com_venda_ultimos_3d, 0) = 0
        AND COALESCE(p.estoque_atual, 0) > 0
        AND ($2 IS NULL OR p.curva_abcd = ANY($2))
        %s
      ORDER BY
        nivel_score DESC,
        COALESCE(p.venda_media_diaria_60d, 0) DESC,
        p.descricao ASC
      LIMIT $3 OFFSET $4
    ),
    segmentos_hierarquia AS (
      SELECT DISTINCT
        segmento,
        grupo,
        subgrupo
      FROM produtos_ruptura
    )
    SELECT COALESCE(
      (SELECT
        json_agg(
          json_build_object(
            ''segmento_nome'', s.segmento,
            ''grupos'', (
              SELECT COALESCE(json_agg(
                json_build_object(
                  ''grupo_nome'', g.grupo,
                  ''subgrupos'', (
                    SELECT COALESCE(json_agg(
                      json_build_object(
                        ''subgrupo_nome'', sg.subgrupo,
                        ''produtos'', (
                          SELECT COALESCE(json_agg(
                            json_build_object(
                              ''produto_id'', pr.produto_id,
                              ''filial_id'', pr.filial_id,
                              ''filial_nome'', pr.filial_nome,
                              ''produto_descricao'', pr.produto_nome,
                              ''estoque_atual'', pr.estoque_atual,
                              ''curva_venda'', pr.curva_abcd,
                              ''dias_com_venda_60d'', pr.dias_com_venda_60d,
                              ''dias_com_venda_ultimos_3d'', pr.dias_com_venda_ultimos_3d,
                              ''venda_media_diaria_60d'', pr.venda_media_diaria_60d,
                              ''valor_estoque_parado'', pr.valor_estoque_parado,
                              ''nivel_ruptura'', pr.nivel_ruptura
                            )
                            ORDER BY pr.nivel_score DESC, pr.venda_media_diaria_60d DESC, pr.produto_nome
                          ), ''[]''::json)
                          FROM produtos_ruptura pr
                          WHERE pr.segmento = s.segmento
                            AND pr.grupo = g.grupo
                            AND pr.subgrupo = sg.subgrupo
                        )
                      )
                      ORDER BY sg.subgrupo
                    ), ''[]''::json)
                    FROM (SELECT DISTINCT subgrupo FROM segmentos_hierarquia WHERE segmento = s.segmento AND grupo = g.grupo) sg
                  )
                )
                ORDER BY g.grupo
              ), ''[]''::json)
              FROM (SELECT DISTINCT grupo FROM segmentos_hierarquia WHERE segmento = s.segmento) g
            )
          )
          ORDER BY s.segmento
        )
      FROM (SELECT DISTINCT segmento FROM segmentos_hierarquia) s),
      ''[]''::json
    )
  ',
    schema_name,
    schema_name,
    schema_name,
    schema_name,
    schema_name,
    CASE
      WHEN p_filiais IS NOT NULL AND array_length(p_filiais, 1) > 0
      THEN 'AND p.filial_id = ANY($5)'
      ELSE ''
    END
  );

  -- Executar query principal
  IF p_filiais IS NOT NULL AND array_length(p_filiais, 1) > 0 THEN
    EXECUTE v_query INTO v_result USING p_limite_minimo_dias, p_curvas, p_page_size, v_offset, p_filiais;
  ELSE
    EXECUTE v_query INTO v_result USING p_limite_minimo_dias, p_curvas, p_page_size, v_offset;
  END IF;

  -- ============================================================================
  -- RETORNO
  -- ============================================================================
  RETURN QUERY SELECT COALESCE(v_total_records, 0), p_page, p_page_size, v_total_pages, v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao executar get_ruptura_venda_60d_report: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$function$;

-- ============================================================================
-- COMENTÁRIO DA FUNÇÃO
-- ============================================================================
COMMENT ON FUNCTION public.get_ruptura_venda_60d_report IS
'Ruptura Vendas - Dias sem Giro
Retorna produtos que tinham giro consistente e pararam de vender.

VERSÃO: 2.0 - Critérios configuráveis

CONCEITO:
---------
"Dias sem Giro" - Identifica produtos que:
  - Venderam em pelo menos X dias dos últimos 60 (configurável)
  - NÃO venderam (pararam de girar) nos últimos 3 dias
  - Tem estoque disponível
  - São de curvas relevantes (A, B, C por padrão)

NÍVEIS DE RUPTURA (calculados dinamicamente):
---------------------------------------------
- CRÍTICO: dias >= 50 E curva A
- ALTO: dias >= 40 E curva A ou B
- MÉDIO: dias >= 30
- BAIXO: dias >= 20
- NORMAL: dias < 20

PARÂMETROS:
-----------
- schema_name: Schema do tenant (ex: okilao, lucia)
- p_filiais: Array de IDs de filiais (NULL = todas)
- p_limite_minimo_dias: Mínimo de dias com venda (default: 20)
- p_curvas: Array de curvas a filtrar (default: A, B, C)
- p_page: Página atual (default: 1)
- p_page_size: Itens por página (default: 50)

EXEMPLOS:
---------
-- Padrão (>= 20 dias, curvas A/B/C)
SELECT * FROM public.get_ruptura_venda_60d_report(''okilao'');

-- Mais restritivo (>= 30 dias, apenas curva A)
SELECT * FROM public.get_ruptura_venda_60d_report(
  ''okilao'',
  NULL,
  30,
  ARRAY[''A'']
);

-- Mais abrangente (>= 10 dias, todas as curvas)
SELECT * FROM public.get_ruptura_venda_60d_report(
  ''lucia'',
  NULL,
  10,
  ARRAY[''A'',''B'',''C'',''D'']
);';

-- ============================================================================
-- GRANT DE PERMISSÕES
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.get_ruptura_venda_60d_report TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ruptura_venda_60d_report TO service_role;
