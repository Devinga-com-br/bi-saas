-- ============================================================================
-- FIX: Adicionar calculo de custo e lucro em atualizar_valores_realizados_todos_setores
-- ============================================================================
-- Data: 2025-12-16
-- Problema: A funcao original so calculava total_vendas, ignorando custo e lucro
-- Solucao: Adicionar total_custo e total_lucro em cada UNION ALL e no UPDATE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.atualizar_valores_realizados_todos_setores(
  p_schema TEXT,
  p_mes INT,
  p_ano INT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '180s'
SET work_mem = '512MB'
AS $$
DECLARE
  v_date_start DATE;
  v_date_end DATE;
  v_query_start TIMESTAMP;
  v_query_duration INTERVAL;
  v_total_rows INT := 0;
  v_total_setores INT := 0;
  v_errors TEXT[] := ARRAY[]::TEXT[];
  v_update_sql TEXT;
BEGIN
  v_query_start := clock_timestamp();

  -- Validar parametros
  IF p_schema IS NULL OR p_mes IS NULL OR p_ano IS NULL THEN
    RAISE EXCEPTION 'Schema, mes e ano sao obrigatorios';
  END IF;

  IF p_mes < 1 OR p_mes > 12 THEN
    RAISE EXCEPTION 'Mes invalido: %', p_mes;
  END IF;

  -- Calcular range de datas UMA VEZ
  v_date_start := make_date(p_ano, p_mes, 1);
  v_date_end := v_date_start + INTERVAL '1 month' - INTERVAL '1 day';

  RAISE NOTICE 'Processando valores realizados para: schema=%, mes=%, ano=%',
    p_schema, p_mes, p_ano;
  RAISE NOTICE 'Periodo: % a %', v_date_start, v_date_end;
  RAISE NOTICE '';
  RAISE NOTICE 'ESTRATEGIA: UNION ALL (processa todos setores de uma vez) COM CUSTO/LUCRO';
  RAISE NOTICE '';

  -- ============================================================================
  -- UNION ALL STRATEGY: Processa todos setores em UMA query
  -- AGORA COM CALCULO DE CUSTO E LUCRO
  -- ============================================================================

  v_update_sql := format('
    WITH setores_ativos AS (
      -- Buscar todos setores ativos com suas configuracoes
      SELECT
        id AS setor_id,
        nome AS setor_nome,
        departamento_nivel,
        departamento_ids
      FROM %I.setores
      WHERE ativo = true
    ),
    vendas_por_setor AS (
      -- ========================================
      -- NIVEL 2: Setores com departamento_nivel = 2
      -- ========================================
      SELECT
        sa.setor_id,
        v.data_venda,
        v.filial_id,
        SUM(v.valor_vendas) - COALESCE(SUM(d.valor_desconto), 0) AS total_vendas,
        SUM(v.quantidade * v.custo_compra) AS total_custo,
        (SUM(v.valor_vendas) - COALESCE(SUM(d.valor_desconto), 0)) - SUM(v.quantidade * v.custo_compra) AS total_lucro
      FROM setores_ativos sa
      INNER JOIN %I.departments_level_1 dl1
        ON dl1.pai_level_2_id = ANY(sa.departamento_ids)
        AND sa.departamento_nivel = 2
      INNER JOIN %I.produtos p
        ON p.departamento_id = dl1.departamento_id
      INNER JOIN %I.vendas v
        ON v.id_produto = p.id
        AND v.filial_id = p.filial_id
        AND v.data_venda >= $1
        AND v.data_venda <= $2
      LEFT JOIN %I.descontos_venda d
        ON d.data_desconto = v.data_venda
        AND d.filial_id = v.filial_id
      WHERE sa.departamento_nivel = 2
      GROUP BY sa.setor_id, v.data_venda, v.filial_id

      UNION ALL

      -- ========================================
      -- NIVEL 3: Setores com departamento_nivel = 3
      -- ========================================
      SELECT
        sa.setor_id,
        v.data_venda,
        v.filial_id,
        SUM(v.valor_vendas) - COALESCE(SUM(d.valor_desconto), 0) AS total_vendas,
        SUM(v.quantidade * v.custo_compra) AS total_custo,
        (SUM(v.valor_vendas) - COALESCE(SUM(d.valor_desconto), 0)) - SUM(v.quantidade * v.custo_compra) AS total_lucro
      FROM setores_ativos sa
      INNER JOIN %I.departments_level_1 dl1
        ON dl1.pai_level_3_id = ANY(sa.departamento_ids)
        AND sa.departamento_nivel = 3
      INNER JOIN %I.produtos p
        ON p.departamento_id = dl1.departamento_id
      INNER JOIN %I.vendas v
        ON v.id_produto = p.id
        AND v.filial_id = p.filial_id
        AND v.data_venda >= $1
        AND v.data_venda <= $2
      LEFT JOIN %I.descontos_venda d
        ON d.data_desconto = v.data_venda
        AND d.filial_id = v.filial_id
      WHERE sa.departamento_nivel = 3
      GROUP BY sa.setor_id, v.data_venda, v.filial_id

      UNION ALL

      -- ========================================
      -- NIVEL 4: Setores com departamento_nivel = 4
      -- ========================================
      SELECT
        sa.setor_id,
        v.data_venda,
        v.filial_id,
        SUM(v.valor_vendas) - COALESCE(SUM(d.valor_desconto), 0) AS total_vendas,
        SUM(v.quantidade * v.custo_compra) AS total_custo,
        (SUM(v.valor_vendas) - COALESCE(SUM(d.valor_desconto), 0)) - SUM(v.quantidade * v.custo_compra) AS total_lucro
      FROM setores_ativos sa
      INNER JOIN %I.departments_level_1 dl1
        ON dl1.pai_level_4_id = ANY(sa.departamento_ids)
        AND sa.departamento_nivel = 4
      INNER JOIN %I.produtos p
        ON p.departamento_id = dl1.departamento_id
      INNER JOIN %I.vendas v
        ON v.id_produto = p.id
        AND v.filial_id = p.filial_id
        AND v.data_venda >= $1
        AND v.data_venda <= $2
      LEFT JOIN %I.descontos_venda d
        ON d.data_desconto = v.data_venda
        AND d.filial_id = v.filial_id
      WHERE sa.departamento_nivel = 4
      GROUP BY sa.setor_id, v.data_venda, v.filial_id

      UNION ALL

      -- ========================================
      -- NIVEL 5: Setores com departamento_nivel = 5
      -- ========================================
      SELECT
        sa.setor_id,
        v.data_venda,
        v.filial_id,
        SUM(v.valor_vendas) - COALESCE(SUM(d.valor_desconto), 0) AS total_vendas,
        SUM(v.quantidade * v.custo_compra) AS total_custo,
        (SUM(v.valor_vendas) - COALESCE(SUM(d.valor_desconto), 0)) - SUM(v.quantidade * v.custo_compra) AS total_lucro
      FROM setores_ativos sa
      INNER JOIN %I.departments_level_1 dl1
        ON dl1.pai_level_5_id = ANY(sa.departamento_ids)
        AND sa.departamento_nivel = 5
      INNER JOIN %I.produtos p
        ON p.departamento_id = dl1.departamento_id
      INNER JOIN %I.vendas v
        ON v.id_produto = p.id
        AND v.filial_id = p.filial_id
        AND v.data_venda >= $1
        AND v.data_venda <= $2
      LEFT JOIN %I.descontos_venda d
        ON d.data_desconto = v.data_venda
        AND d.filial_id = v.filial_id
      WHERE sa.departamento_nivel = 5
      GROUP BY sa.setor_id, v.data_venda, v.filial_id

      UNION ALL

      -- ========================================
      -- NIVEL 6: Setores com departamento_nivel = 6
      -- ========================================
      SELECT
        sa.setor_id,
        v.data_venda,
        v.filial_id,
        SUM(v.valor_vendas) - COALESCE(SUM(d.valor_desconto), 0) AS total_vendas,
        SUM(v.quantidade * v.custo_compra) AS total_custo,
        (SUM(v.valor_vendas) - COALESCE(SUM(d.valor_desconto), 0)) - SUM(v.quantidade * v.custo_compra) AS total_lucro
      FROM setores_ativos sa
      INNER JOIN %I.departments_level_1 dl1
        ON dl1.pai_level_6_id = ANY(sa.departamento_ids)
        AND sa.departamento_nivel = 6
      INNER JOIN %I.produtos p
        ON p.departamento_id = dl1.departamento_id
      INNER JOIN %I.vendas v
        ON v.id_produto = p.id
        AND v.filial_id = p.filial_id
        AND v.data_venda >= $1
        AND v.data_venda <= $2
      LEFT JOIN %I.descontos_venda d
        ON d.data_desconto = v.data_venda
        AND d.filial_id = v.filial_id
      WHERE sa.departamento_nivel = 6
      GROUP BY sa.setor_id, v.data_venda, v.filial_id
    ),
    setores_contados AS (
      SELECT COUNT(DISTINCT id) AS total
      FROM %I.setores
      WHERE ativo = true
    )
    -- UPDATE EM MASSA: Atualiza TODAS as metas de TODOS os setores de uma vez
    -- AGORA COM custo_realizado e lucro_realizado
    UPDATE %I.metas_setor ms
    SET
      valor_realizado = COALESCE(vps.total_vendas, 0),
      custo_realizado = COALESCE(vps.total_custo, 0),
      lucro_realizado = COALESCE(vps.total_lucro, 0),
      diferenca = COALESCE(vps.total_vendas, 0) - ms.valor_meta,
      diferenca_percentual = CASE
        WHEN ms.valor_meta > 0 THEN
          ((COALESCE(vps.total_vendas, 0) / ms.valor_meta) - 1) * 100
        ELSE 0
      END,
      updated_at = NOW()
    FROM vendas_por_setor vps
    WHERE
      ms.setor_id = vps.setor_id
      AND ms.data = vps.data_venda
      AND ms.filial_id = vps.filial_id
      AND (
        ms.valor_realizado IS DISTINCT FROM COALESCE(vps.total_vendas, 0)
        OR ms.custo_realizado IS DISTINCT FROM COALESCE(vps.total_custo, 0)
        OR ms.lucro_realizado IS DISTINCT FROM COALESCE(vps.total_lucro, 0)
      )
    RETURNING (SELECT total FROM setores_contados)
  ',
    p_schema,  -- setores_ativos
    p_schema,  -- dl1 (nivel 2)
    p_schema,  -- produtos (nivel 2)
    p_schema,  -- vendas (nivel 2)
    p_schema,  -- descontos_venda (nivel 2)
    p_schema,  -- dl1 (nivel 3)
    p_schema,  -- produtos (nivel 3)
    p_schema,  -- vendas (nivel 3)
    p_schema,  -- descontos_venda (nivel 3)
    p_schema,  -- dl1 (nivel 4)
    p_schema,  -- produtos (nivel 4)
    p_schema,  -- vendas (nivel 4)
    p_schema,  -- descontos_venda (nivel 4)
    p_schema,  -- dl1 (nivel 5)
    p_schema,  -- produtos (nivel 5)
    p_schema,  -- vendas (nivel 5)
    p_schema,  -- descontos_venda (nivel 5)
    p_schema,  -- dl1 (nivel 6)
    p_schema,  -- produtos (nivel 6)
    p_schema,  -- vendas (nivel 6)
    p_schema,  -- descontos_venda (nivel 6)
    p_schema,  -- setores_contados
    p_schema   -- metas_setor
  );

  -- Executar UPDATE em massa
  BEGIN
    EXECUTE v_update_sql
    USING v_date_start, v_date_end
    INTO v_total_setores;

    GET DIAGNOSTICS v_total_rows = ROW_COUNT;

  EXCEPTION WHEN OTHERS THEN
    v_errors := array_append(v_errors, format('Erro no UPDATE em massa: %s', SQLERRM));
    RAISE WARNING 'Erro ao processar UPDATE em massa: %', SQLERRM;
  END;

  v_query_duration := clock_timestamp() - v_query_start;

  RAISE NOTICE '';
  RAISE NOTICE 'Processamento concluido em %', v_query_duration;
  RAISE NOTICE '   - Setores processados: %', COALESCE(v_total_setores, 0);
  RAISE NOTICE '   - Metas atualizadas: %', v_total_rows;
  RAISE NOTICE '';

  -- Retorna resultado agregado
  RETURN json_build_object(
    'success', true,
    'message', format('Processados %s setores, %s metas atualizadas (com custo/lucro)', COALESCE(v_total_setores, 0), v_total_rows),
    'rows_updated', v_total_rows,
    'setores_processados', COALESCE(v_total_setores, 0),
    'errors', v_errors,
    'timestamp', NOW(),
    'duration_ms', EXTRACT(EPOCH FROM v_query_duration) * 1000,
    'strategy', 'UNION ALL (batch update) + custo/lucro'
  );

EXCEPTION
  WHEN query_canceled THEN
    RAISE EXCEPTION 'Timeout ao atualizar valores (>180s). Considere executar em horario de baixo trafego.';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao atualizar valores: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$;

-- ============================================================================
-- ATUALIZAR COMENTARIOS
-- ============================================================================

COMMENT ON FUNCTION public.atualizar_valores_realizados_todos_setores IS
'Atualiza os valores realizados de TODOS os setores de uma vez (VERSAO COM CUSTO/LUCRO).

NOVIDADE (2025-12-16):
- Agora calcula e atualiza custo_realizado e lucro_realizado
- total_custo = SUM(quantidade * custo_compra)
- total_lucro = total_vendas - total_custo

ESTRATEGIA: UNION ALL
- Processa TODOS os setores em UMA UNICA QUERY
- Faz UMA UNICA varredura na tabela vendas
- Atualiza todas as metas_setor em um unico UPDATE em massa

PARAMETROS:
- p_schema: Nome do schema do tenant (ex: ''okilao'')
- p_mes: Mes (1-12)
- p_ano: Ano (ex: 2025)

RETORNO:
JSON com:
- success: boolean
- rows_updated: numero de linhas atualizadas
- setores_processados: quantidade de setores processados
- errors: array de erros (se houver)
- timestamp: timestamp da execucao
- duration_ms: tempo de execucao em milissegundos
- strategy: "UNION ALL (batch update) + custo/lucro"';
