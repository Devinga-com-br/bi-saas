-- ============================================================================
-- RPC: get_ruptura_venda_60d_report
-- ============================================================================
-- Data: 2025-12-18
-- Descricao: Retorna produtos que tinham vendas consistentes (60 dias)
--            mas PARARAM de vender nos ultimos 3 dias
-- ============================================================================
--
-- CONCEITO DE NEGOCIO:
-- --------------------
-- "Ruptura de Venda 60D" NAO e falta de estoque!
-- E um produto que:
--   1. Vendeu TODOS os dias nos ultimos 60 dias (dias_com_venda_60d = 60)
--   2. NAO vendeu nos ultimos 3 dias (dias_com_venda_ultimos_3d = 0)
--   3. TEM estoque disponivel (estoque_atual > 0)
--
-- Isso indica um PROBLEMA: produto disponivel que parou de sair.
-- Possiveis causas: exposicao ruim, preco, concorrencia, sazonalidade.
--
-- PERIODO DE ANALISE:
-- -------------------
--   Dia 1-3:   Ultimos 3 dias (deve ter 0 vendas para entrar no relatorio)
--   Dia 4-63:  60 dias anteriores (deve ter vendido todos os dias)
--   Total:     63 dias de janela de analise
--
-- ============================================================================

-- Dropar versoes anteriores (diferentes assinaturas)
DROP FUNCTION IF EXISTS public.get_ruptura_venda_60d_report(text, integer[], integer, integer, integer);

CREATE OR REPLACE FUNCTION public.get_ruptura_venda_60d_report(
  schema_name text,
  p_filiais integer[] DEFAULT NULL::integer[],
  p_limite_minimo_dias integer DEFAULT 30,  -- NOTA: Parametro mantido por compatibilidade, mas NAO usado na logica atual
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
SET statement_timeout TO '60s'
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
  -- VALIDACAO DE ENTRADA
  -- ============================================================================
  IF schema_name IS NULL OR schema_name = '' THEN
    RAISE EXCEPTION 'schema_name não pode ser nulo ou vazio';
  END IF;

  -- Calcular offset para paginacao
  v_offset := (p_page - 1) * p_page_size;

  -- ============================================================================
  -- QUERY DE CONTAGEM
  -- ============================================================================
  -- Conta produtos que atendem aos criterios de ruptura:
  --   - dias_com_venda_60d = 60 (vendeu todos os dias do periodo)
  --   - dias_com_venda_ultimos_3d = 0 (parou de vender)
  --   - estoque_atual > 0 (tem produto disponivel)
  -- ============================================================================
  v_count_query := format('
    SELECT COUNT(*)
    FROM %I.produtos p
    WHERE
      COALESCE(p.dias_com_venda_60d, 0) = 60
      AND COALESCE(p.dias_com_venda_ultimos_3d, 0) = 0
      AND COALESCE(p.estoque_atual, 0) > 0
      %s
  ',
    schema_name,
    CASE
      WHEN p_filiais IS NOT NULL AND array_length(p_filiais, 1) > 0
      THEN 'AND p.filial_id = ANY($2)'
      ELSE ''
    END
  );

  -- Executar contagem
  IF p_filiais IS NOT NULL AND array_length(p_filiais, 1) > 0 THEN
    EXECUTE v_count_query INTO v_total_records USING p_filiais;
  ELSE
    EXECUTE v_count_query INTO v_total_records;
  END IF;

  -- Calcular total de paginas
  v_total_pages := GREATEST(CEIL(v_total_records::numeric / p_page_size), 1);

  -- ============================================================================
  -- QUERY PRINCIPAL
  -- ============================================================================
  -- Retorna hierarquia: Segmento > Grupo > Subgrupo > Produtos
  -- Usa departments_level_1, 2, 3 para montar a hierarquia
  -- ============================================================================
  v_query := format('
    WITH produtos_ruptura AS (
      SELECT
        p.id as produto_id,
        p.filial_id,
        CAST(COALESCE(p.filial_id, 0) AS TEXT) as filial_nome,
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
        ''CRÍTICO'' as nivel_ruptura  -- Todos sao CRITICOS: venderam 60 dias seguidos e pararam
      FROM %I.produtos p
      LEFT JOIN %I.departments_level_1 d1 ON d1.departamento_id = p.departamento_id
      LEFT JOIN %I.departments_level_2 d2 ON d2.departamento_id = d1.pai_level_2_id
      LEFT JOIN %I.departments_level_3 d3 ON d3.departamento_id = d2.pai_level_3_id
      WHERE
        COALESCE(p.dias_com_venda_60d, 0) = 60
        AND COALESCE(p.dias_com_venda_ultimos_3d, 0) = 0
        AND COALESCE(p.estoque_atual, 0) > 0
        %s
      ORDER BY
        COALESCE(p.venda_media_diaria_60d, 0) DESC,
        p.descricao ASC
      LIMIT $1 OFFSET $2
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
                            ORDER BY pr.produto_nome
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
    CASE
      WHEN p_filiais IS NOT NULL AND array_length(p_filiais, 1) > 0
      THEN 'AND p.filial_id = ANY($3)'
      ELSE ''
    END
  );

  -- Executar query principal
  IF p_filiais IS NOT NULL AND array_length(p_filiais, 1) > 0 THEN
    EXECUTE v_query INTO v_result USING p_page_size, v_offset, p_filiais;
  ELSE
    EXECUTE v_query INTO v_result USING p_page_size, v_offset;
  END IF;

  -- ============================================================================
  -- RETORNO
  -- ============================================================================
  RETURN QUERY SELECT v_total_records, p_page, p_page_size, v_total_pages, v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao executar get_ruptura_venda_60d_report: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$function$;

-- ============================================================================
-- COMENTARIO DA FUNCAO
-- ============================================================================
COMMENT ON FUNCTION public.get_ruptura_venda_60d_report IS
'Retorna produtos em ruptura de vendas (vendiam consistentemente e pararam).

CONCEITO:
---------
Identifica produtos que:
  - Venderam TODOS os 60 dias do periodo de analise
  - NAO venderam nos ultimos 3 dias
  - Tem estoque disponivel

Isso indica um problema operacional: produto disponivel que parou de sair.

PARAMETROS:
-----------
- schema_name: Schema do tenant (ex: okilao, lucia, paraiso)
- p_filiais: Array de IDs de filiais (NULL = todas)
- p_limite_minimo_dias: NAO UTILIZADO (mantido por compatibilidade)
- p_page: Pagina atual (default: 1)
- p_page_size: Itens por pagina (default: 50)

RETORNO:
--------
{
  "total_records": integer,
  "page": integer,
  "page_size": integer,
  "total_pages": integer,
  "segmentos": [
    {
      "segmento_nome": "ALIMENTOS",
      "grupos": [
        {
          "grupo_nome": "MERCEARIA",
          "subgrupos": [
            {
              "subgrupo_nome": "ARROZ",
              "produtos": [
                {
                  "produto_id": 123,
                  "filial_id": 1,
                  "filial_nome": "1",
                  "produto_descricao": "ARROZ TIPO 1 5KG",
                  "estoque_atual": 50,
                  "curva_venda": "A",
                  "dias_com_venda_60d": 60,
                  "dias_com_venda_ultimos_3d": 0,
                  "venda_media_diaria_60d": 8.5,
                  "valor_estoque_parado": 750.00,
                  "nivel_ruptura": "CRÍTICO"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}

COLUNAS NECESSARIAS NA TABELA produtos:
---------------------------------------
- id (PK)
- filial_id
- descricao
- departamento_id (FK para departments_level_1)
- curva_abcd
- dias_com_venda_60d (calculado por ETL/MV)
- dias_com_venda_ultimos_3d (calculado por ETL/MV)
- estoque_atual
- venda_media_diaria_60d (calculado por ETL/MV)
- preco_de_custo

HIERARQUIA DE DEPARTAMENTOS:
----------------------------
- departments_level_3 → Segmento (nivel mais alto)
- departments_level_2 → Grupo
- departments_level_1 → Subgrupo (vinculado ao produto)

EXEMPLO DE USO:
---------------
SELECT * FROM public.get_ruptura_venda_60d_report(
  ''okilao'',
  NULL,      -- todas as filiais
  30,        -- parametro ignorado
  1,         -- pagina 1
  50         -- 50 itens por pagina
);

-- Com filtro de filiais:
SELECT * FROM public.get_ruptura_venda_60d_report(
  ''lucia'',
  ARRAY[1, 2, 3],  -- filiais 1, 2 e 3
  30,
  1,
  100
);';

-- ============================================================================
-- GRANT DE PERMISSOES
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.get_ruptura_venda_60d_report TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ruptura_venda_60d_report TO service_role;
