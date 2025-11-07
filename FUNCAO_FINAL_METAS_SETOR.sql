-- ============================================================================
-- FUNÇÃO FINAL CORRETA: get_metas_setor_report_optimized
-- VERSÃO SIMPLIFICADA - metas_setor JÁ TEM valor_realizado
-- ============================================================================

-- REMOVER TODAS AS VERSÕES ANTIGAS
DROP FUNCTION IF EXISTS get_metas_setor_report_optimized(text, bigint, integer, integer, bigint[]);
DROP FUNCTION IF EXISTS get_metas_setor_report(text, bigint, integer, integer, bigint, bigint[]);
DROP FUNCTION IF EXISTS get_metas_setor_report(text, integer, integer, bigint, bigint[]);
DROP FUNCTION IF EXISTS get_metas_setores_report(text, integer, integer, bigint, bigint[]);

-- ============================================================================
-- CRIAR FUNÇÃO OTIMIZADA
-- ============================================================================
CREATE OR REPLACE FUNCTION get_metas_setor_report_optimized(
  p_schema TEXT,
  p_setor_id BIGINT,
  p_mes INT,
  p_ano INT,
  p_filial_ids BIGINT[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SET statement_timeout = '30s'
AS $$
DECLARE
  v_date_start DATE;
  v_date_end DATE;
  v_result JSONB;
BEGIN
  -- Calcular range de datas do mês
  v_date_start := make_date(p_ano, p_mes, 1);
  v_date_end := (v_date_start + INTERVAL '1 month - 1 day')::DATE;

  -- Buscar metas já com valores realizados
  -- (a tabela metas_setor já armazena valor_realizado, diferenca, etc.)
  EXECUTE format($query$
    WITH metas_filtradas AS (
      SELECT
        ms.data,
        ms.filial_id,
        ms.dia_semana,
        ms.data_referencia,
        ms.dia_semana_ref,
        ms.valor_referencia,
        ms.meta_percentual,
        ms.valor_meta,
        COALESCE(ms.valor_realizado, 0) as valor_realizado,
        COALESCE(ms.diferenca, 0) as diferenca,
        COALESCE(ms.diferenca_percentual, 0) as diferenca_percentual
      FROM %I.metas_setor ms
      WHERE ms.setor_id = $1
        AND ms.data >= $2
        AND ms.data <= $3
        %s
    ),
    grouped_by_date AS (
      -- Agrupar por data, criando array de filiais
      SELECT
        mf.data,
        mf.dia_semana,
        jsonb_agg(
          jsonb_build_object(
            'filial_id', mf.filial_id,
            'data_referencia', mf.data_referencia,
            'dia_semana_ref', mf.dia_semana_ref,
            'valor_referencia', mf.valor_referencia,
            'meta_percentual', mf.meta_percentual,
            'valor_meta', mf.valor_meta,
            'valor_realizado', mf.valor_realizado,
            'diferenca', mf.diferenca,
            'diferenca_percentual', mf.diferenca_percentual
          ) ORDER BY mf.filial_id
        ) as filiais
      FROM metas_filtradas mf
      GROUP BY mf.data, mf.dia_semana
    )
    -- Resultado final
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'data', gbd.data,
          'dia_semana', gbd.dia_semana,
          'filiais', gbd.filiais
        ) ORDER BY gbd.data
      ),
      '[]'::jsonb
    )
    FROM grouped_by_date gbd
  $query$,
    p_schema,
    CASE WHEN p_filial_ids IS NOT NULL THEN 'AND ms.filial_id = ANY($4)' ELSE '' END
  ) INTO v_result
  USING p_setor_id, v_date_start, v_date_end, p_filial_ids;

  RETURN COALESCE(v_result, '[]'::jsonb);

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '[META_SETOR] Erro: % - %', SQLERRM, SQLSTATE;
    RETURN '[]'::jsonb;
END;
$$;

-- ============================================================================
-- FUNÇÃO PARA ATUALIZAR VALORES REALIZADOS (EXECUTAR PERIODICAMENTE)
-- ============================================================================
-- Esta função ATUALIZA a coluna valor_realizado na tabela metas_setor
-- Deve ser executada diariamente ou quando solicitar "Atualizar Valores"

CREATE OR REPLACE FUNCTION atualizar_valores_realizados_metas_setor(
  p_schema TEXT,
  p_mes INT,
  p_ano INT
)
RETURNS TABLE(
  total_metas_atualizadas BIGINT,
  setores_processados TEXT[]
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_date_start DATE;
  v_date_end DATE;
  v_total_updated BIGINT := 0;
  v_setores TEXT[];
  v_setor RECORD;
  v_departamentos_nivel_1 BIGINT[];
BEGIN
  -- Calcular range de datas
  v_date_start := make_date(p_ano, p_mes, 1);
  v_date_end := (v_date_start + INTERVAL '1 month - 1 day')::DATE;

  -- Buscar todos os setores ativos
  FOR v_setor IN
    EXECUTE format('SELECT id, nome, departamento_ids, departamento_nivel FROM %I.setores WHERE ativo = true', p_schema)
  LOOP
    RAISE NOTICE '[ATUALIZAR] Processando setor: % (nível %)', v_setor.nome, v_setor.departamento_nivel;

    -- Buscar departamentos nível 1 do setor
    EXECUTE format($dept$
      SELECT ARRAY_AGG(DISTINCT dl1.departamento_id)
      FROM %I.departments_level_1 dl1
      WHERE
        CASE $1
          WHEN 1 THEN dl1.departamento_id = ANY($2::BIGINT[])
          WHEN 2 THEN dl1.pai_level_2_id = ANY($2::BIGINT[])
          WHEN 3 THEN dl1.pai_level_3_id = ANY($2::BIGINT[])
          WHEN 4 THEN dl1.pai_level_4_id = ANY($2::BIGINT[])
          WHEN 5 THEN dl1.pai_level_5_id = ANY($2::BIGINT[])
          WHEN 6 THEN dl1.pai_level_6_id = ANY($2::BIGINT[])
          ELSE FALSE
        END
    $dept$, p_schema)
    INTO v_departamentos_nivel_1
    USING v_setor.departamento_nivel,
          (SELECT ARRAY_AGG(dept_id::BIGINT) FROM UNNEST(v_setor.departamento_ids) AS dept_id);

    IF v_departamentos_nivel_1 IS NULL OR array_length(v_departamentos_nivel_1, 1) = 0 THEN
      RAISE NOTICE '[ATUALIZAR] Setor % não tem departamentos nível 1', v_setor.nome;
      CONTINUE;
    END IF;

    -- Atualizar valores realizados para este setor
    EXECUTE format($update$
      UPDATE %I.metas_setor
      SET
        valor_realizado = COALESCE(vendas_calc.total_vendas, 0),
        diferenca = COALESCE(vendas_calc.total_vendas, 0) - valor_meta,
        diferenca_percentual = CASE
          WHEN valor_meta > 0 THEN
            ((COALESCE(vendas_calc.total_vendas, 0) - valor_meta) / valor_meta * 100)
          ELSE 0
        END,
        updated_at = NOW()
      FROM (
        SELECT
          v.data as venda_data,
          v.filial_id as venda_filial_id,
          COALESCE(SUM(v.valor_total_liquido), 0) as total_vendas
        FROM %I.vendas v
        INNER JOIN %I.produtos p
          ON p.id = v.id_produto AND p.filial_id = v.filial_id
        WHERE v.data >= $1
          AND v.data <= $2
          AND p.departamento_id = ANY($3)
        GROUP BY v.data, v.filial_id
      ) vendas_calc
      WHERE setor_id = $4
        AND data = vendas_calc.venda_data
        AND filial_id = vendas_calc.venda_filial_id
    $update$, p_schema, p_schema, p_schema)
    USING v_date_start, v_date_end, v_departamentos_nivel_1, v_setor.id;

    GET DIAGNOSTICS v_total_updated = ROW_COUNT;
    RAISE NOTICE '[ATUALIZAR] Setor %: % metas atualizadas', v_setor.nome, v_total_updated;

    v_setores := array_append(v_setores, v_setor.nome);
  END LOOP;

  RETURN QUERY SELECT v_total_updated, v_setores;
END;
$$;

-- ============================================================================
-- ÍNDICES (executar para cada schema)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_departments_level_1_pai_level_2
  ON saoluiz.departments_level_1(pai_level_2_id) WHERE pai_level_2_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_departments_level_1_pai_level_5
  ON saoluiz.departments_level_1(pai_level_5_id) WHERE pai_level_5_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_produtos_filial_departamento
  ON saoluiz.produtos(filial_id, departamento_id);

-- ÍNDICE REMOVIDO: idx_vendas_data_filial_produto
-- Se necessário, verificar o nome correto da coluna de data na tabela vendas
-- e criar manualmente: CREATE INDEX IF NOT EXISTS idx_vendas_data_filial_produto
--   ON saoluiz.vendas(data, filial_id, id_produto);

ANALYZE saoluiz.departments_level_1;
ANALYZE saoluiz.produtos;
ANALYZE saoluiz.vendas;
ANALYZE saoluiz.metas_setor;

-- ============================================================================
-- TESTES
-- ============================================================================

-- 1. ATUALIZAR valores realizados do mês atual
SELECT * FROM atualizar_valores_realizados_metas_setor('saoluiz', 11, 2024);

-- 2. CONSULTAR metas (agora com valores realizados atualizados)
SELECT get_metas_setor_report_optimized(
  'saoluiz',
  8,      -- Açougue
  11,     -- Novembro
  2024,
  NULL    -- Todas as filiais
);

-- 3. Verificar se valores foram atualizados
SELECT
  s.nome as setor,
  ms.filial_id,
  ms.data,
  ms.valor_meta,
  ms.valor_realizado,
  ms.diferenca,
  ms.updated_at
FROM saoluiz.metas_setor ms
JOIN saoluiz.setores s ON s.id = ms.setor_id
WHERE ms.data >= '2024-11-01'
  AND ms.data < '2024-12-01'
ORDER BY s.nome, ms.filial_id, ms.data
LIMIT 20;

-- ============================================================================
-- COMO USAR NO SISTEMA
-- ============================================================================
-- 1. Botão "Atualizar Valores" deve chamar:
--    POST /api/metas/setor/atualizar-valores
--    Body: { schema, mes, ano }
--
-- 2. API route cria:
--    const { data } = await supabase.rpc('atualizar_valores_realizados_metas_setor', {
--      p_schema: schema,
--      p_mes: mes,
--      p_ano: ano
--    })
--
-- 3. Depois de atualizar, recarregar a listagem
