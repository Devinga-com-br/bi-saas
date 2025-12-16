-- Migration: Adicionar Lucro Bruto e Margem Bruta ao Modulo Metas por Setor
-- Data: 2025-12-16
-- Descricao: Adiciona campos custo_realizado e lucro_realizado na tabela metas_setor
--            e atualiza as funcoes RPC para calcular e retornar esses valores

-- ============================================================================
-- FASE 1: ALTER TABLE - Adicionar colunas em todos os schemas
-- ============================================================================

-- Schema: okilao
ALTER TABLE okilao.metas_setor
ADD COLUMN IF NOT EXISTS custo_realizado NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS lucro_realizado NUMERIC(15, 2) DEFAULT 0;

-- Schema: saoluiz
ALTER TABLE saoluiz.metas_setor
ADD COLUMN IF NOT EXISTS custo_realizado NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS lucro_realizado NUMERIC(15, 2) DEFAULT 0;

-- Schema: paraiso
ALTER TABLE paraiso.metas_setor
ADD COLUMN IF NOT EXISTS custo_realizado NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS lucro_realizado NUMERIC(15, 2) DEFAULT 0;

-- Schema: lucia
ALTER TABLE lucia.metas_setor
ADD COLUMN IF NOT EXISTS custo_realizado NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS lucro_realizado NUMERIC(15, 2) DEFAULT 0;

-- Schema: sol
ALTER TABLE sol.metas_setor
ADD COLUMN IF NOT EXISTS custo_realizado NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS lucro_realizado NUMERIC(15, 2) DEFAULT 0;

-- ============================================================================
-- FASE 2: UPDATE FUNCTION - atualizar_valores_realizados_metas_setor
-- ============================================================================
-- Adiciona calculo de custo_realizado e lucro_realizado na CTE

CREATE OR REPLACE FUNCTION public.atualizar_valores_realizados_metas_setor(
  p_schema text,
  p_setor_id bigint,
  p_mes integer,
  p_ano integer,
  p_filial_id bigint DEFAULT NULL::bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout TO '90s'
SET work_mem TO '256MB'
AS $function$
DECLARE
  v_departamento_nivel INT;
  v_departamento_ids BIGINT[];
  v_coluna_pai TEXT;
  v_sql TEXT;
  v_rows_updated INT;
  v_schema_quoted TEXT;
  v_date_start DATE;
  v_date_end DATE;
  v_query_start TIMESTAMP;
  v_query_duration INTERVAL;
BEGIN
  v_query_start := clock_timestamp();

  -- Validar parametros
  IF p_schema IS NULL OR p_setor_id IS NULL OR p_mes IS NULL OR p_ano IS NULL THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Schema, setor_id, mes e ano sao obrigatorios'
    );
  END IF;

  v_schema_quoted := quote_ident(p_schema);

  -- Calcular range de datas UMA VEZ
  v_date_start := make_date(p_ano, p_mes, 1);
  v_date_end := v_date_start + INTERVAL '1 month' - INTERVAL '1 day';

  -- 1. Buscar configuracao do setor
  EXECUTE format('
    SELECT departamento_nivel, departamento_ids
    FROM %I.setores
    WHERE id = $1 AND ativo = true
  ', p_schema)
  INTO v_departamento_nivel, v_departamento_ids
  USING p_setor_id;

  IF v_departamento_nivel IS NULL THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', format('Setor %s nao encontrado ou inativo', p_setor_id)
    );
  END IF;

  IF v_departamento_ids IS NULL OR array_length(v_departamento_ids, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', format('Setor %s nao tem departamentos configurados', p_setor_id),
      'rows_updated', 0,
      'setor_id', p_setor_id
    );
  END IF;

  -- 2. Construir nome da coluna pai dinamicamente
  v_coluna_pai := format('pai_level_%s_id', v_departamento_nivel);

  RAISE NOTICE 'Processando setor %: nivel=%, departamentos=%, coluna=%',
    p_setor_id, v_departamento_nivel, array_length(v_departamento_ids, 1), v_coluna_pai;
  RAISE NOTICE 'Periodo: % a %', v_date_start, v_date_end;

  -- 3. QUERY OTIMIZADA: Range query + covering index + custo/lucro
  v_sql := format('
    WITH vendas_por_data_filial AS (
      SELECT
        v.data_venda,
        v.filial_id,
        SUM(v.valor_vendas) - COALESCE(SUM(d.valor_desconto), 0) AS total_vendas,
        SUM(v.quantidade * v.custo_compra) AS total_custo,
        (SUM(v.valor_vendas) - COALESCE(SUM(d.valor_desconto), 0)) - SUM(v.quantidade * v.custo_compra) AS total_lucro
      FROM %I.vendas v
      INNER JOIN %I.produtos p
        ON p.id = v.id_produto
        AND p.filial_id = v.filial_id
      INNER JOIN %I.departments_level_1 dl1
        ON dl1.departamento_id = p.departamento_id
        AND dl1.%I = ANY($1)
      LEFT JOIN %I.descontos_venda d
        ON d.data_desconto = v.data_venda
        AND d.filial_id = v.filial_id
      WHERE
        v.data_venda >= $2
        AND v.data_venda <= $3
        AND ($4 IS NULL OR v.filial_id = $4)
      GROUP BY v.data_venda, v.filial_id
    )
    UPDATE %I.metas_setor ms
    SET
      valor_realizado = COALESCE(vpd.total_vendas, 0),
      custo_realizado = COALESCE(vpd.total_custo, 0),
      lucro_realizado = COALESCE(vpd.total_lucro, 0),
      diferenca = COALESCE(vpd.total_vendas, 0) - ms.valor_meta,
      diferenca_percentual = CASE
        WHEN ms.valor_meta > 0 THEN
          ((COALESCE(vpd.total_vendas, 0) / ms.valor_meta) - 1) * 100
        ELSE 0
      END,
      updated_at = NOW()
    FROM vendas_por_data_filial vpd
    WHERE
      ms.setor_id = $5
      AND ms.data = vpd.data_venda
      AND ms.filial_id = vpd.filial_id
      AND (
        ms.valor_realizado IS DISTINCT FROM COALESCE(vpd.total_vendas, 0)
        OR ms.custo_realizado IS DISTINCT FROM COALESCE(vpd.total_custo, 0)
        OR ms.lucro_realizado IS DISTINCT FROM COALESCE(vpd.total_lucro, 0)
      )
  ',
    p_schema,         -- FROM vendas
    p_schema,         -- JOIN produtos
    p_schema,         -- JOIN departments_level_1
    v_coluna_pai,     -- coluna pai dinamica
    p_schema,         -- LEFT JOIN descontos_venda
    p_schema          -- UPDATE metas_setor
  );

  -- Executar o UPDATE
  EXECUTE v_sql
  USING v_departamento_ids, v_date_start, v_date_end, p_filial_id, p_setor_id;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  v_query_duration := clock_timestamp() - v_query_start;

  RAISE NOTICE 'Setor % atualizado: % linhas em %', p_setor_id, v_rows_updated, v_query_duration;

  -- Retornar resultado
  RETURN jsonb_build_object(
    'rows_updated', v_rows_updated,
    'setor_id', p_setor_id,
    'mes', p_mes,
    'ano', p_ano,
    'filial_id', p_filial_id,
    'duration_ms', EXTRACT(EPOCH FROM v_query_duration) * 1000
  );

EXCEPTION
  WHEN query_canceled THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', 'Timeout ao atualizar valores (>90s). Verifique se os indices foram criados.',
      'setor_id', p_setor_id,
      'timeout', true
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', SQLERRM,
      'detail', SQLSTATE,
      'setor_id', p_setor_id
    );
END;
$function$;

-- ============================================================================
-- FASE 3: UPDATE FUNCTION - get_metas_setor_report_optimized
-- ============================================================================
-- Adiciona custo_realizado e lucro_realizado no JSON de retorno

CREATE OR REPLACE FUNCTION public.get_metas_setor_report_optimized(
  p_schema text,
  p_setor_id bigint,
  p_mes integer,
  p_ano integer,
  p_filial_ids bigint[] DEFAULT NULL::bigint[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout TO '45s'
SET work_mem TO '64MB'
AS $function$
DECLARE
  v_result JSONB;
  v_date_start DATE;
  v_date_end DATE;
  v_query_start TIMESTAMP;
  v_query_duration INTERVAL;
BEGIN
  v_query_start := clock_timestamp();

  IF p_schema IS NULL OR p_setor_id IS NULL OR p_mes IS NULL OR p_ano IS NULL THEN
    RAISE EXCEPTION 'Schema, setor_id, mes e ano sao obrigatorios';
  END IF;

  IF p_mes < 1 OR p_mes > 12 THEN
    RAISE EXCEPTION 'Mes invalido: % (deve ser 1-12)', p_mes;
  END IF;

  v_date_start := make_date(p_ano, p_mes, 1);
  v_date_end := v_date_start + INTERVAL '1 month' - INTERVAL '1 day';

  RAISE NOTICE 'Buscando metas: schema=%, setor=%, periodo=% a %',
    p_schema, p_setor_id, v_date_start, v_date_end;

  EXECUTE format('
    SELECT COALESCE(json_agg(
      json_build_object(
        ''data'', ms.data,
        ''dia_semana'', ms.dia_semana,
        ''filiais'', (
          SELECT json_agg(
            json_build_object(
              ''filial_id'', msf.filial_id,
              ''filial_nome'', COALESCE(b.descricao, ''Filial '' || msf.filial_id),
              ''data_referencia'', msf.data_referencia,
              ''dia_semana_ref'', msf.dia_semana_ref,
              ''valor_referencia'', COALESCE(msf.valor_referencia, 0),
              ''meta_percentual'', COALESCE(msf.meta_percentual, 0),
              ''valor_meta'', COALESCE(msf.valor_meta, 0),
              ''valor_realizado'', COALESCE(msf.valor_realizado, 0),
              ''custo_realizado'', COALESCE(msf.custo_realizado, 0),
              ''lucro_realizado'', COALESCE(msf.lucro_realizado, 0),
              ''diferenca'', COALESCE(msf.diferenca, 0),
              ''diferenca_percentual'', COALESCE(msf.diferenca_percentual, 0),
              ''percentual_atingido'', CASE
                WHEN COALESCE(msf.valor_meta, 0) > 0 THEN
                  ROUND((COALESCE(msf.valor_realizado, 0) / msf.valor_meta * 100)::numeric, 2)
                ELSE 0
              END
            ) ORDER BY COALESCE(b.descricao, ''Filial '' || msf.filial_id)
          )
          FROM %I.metas_setor msf
          LEFT JOIN public.branches b
            ON b.branch_code = msf.filial_id::text
            AND b.tenant_id = (SELECT id FROM public.tenants WHERE supabase_schema = %L LIMIT 1)
          WHERE msf.setor_id = ms.setor_id
            AND msf.data = ms.data
            AND ($3 IS NULL OR msf.filial_id = ANY($3))
        )
      ) ORDER BY ms.data
    ), ''[]''::json)
    FROM (
      SELECT DISTINCT ms.data, ms.setor_id, ms.dia_semana
      FROM %I.metas_setor ms
      WHERE ms.setor_id = $1
        AND ms.data >= $4
        AND ms.data <= $5
        AND ($3 IS NULL OR ms.filial_id = ANY($3))
    ) ms
  ',
    p_schema,
    p_schema,
    p_schema
  )
  INTO v_result
  USING p_setor_id, p_mes, p_filial_ids, v_date_start, v_date_end;

  v_query_duration := clock_timestamp() - v_query_start;

  RAISE NOTICE 'Query executada em: %', v_query_duration;
  RAISE NOTICE 'Registros retornados: %', COALESCE(jsonb_array_length(v_result), 0);

  RETURN v_result;

EXCEPTION
  WHEN query_canceled THEN
    RAISE EXCEPTION 'Timeout ao buscar metas (>45s).';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao buscar metas: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$function$;

-- ============================================================================
-- COMENTARIOS
-- ============================================================================
COMMENT ON COLUMN okilao.metas_setor.custo_realizado IS 'Custo total realizado no dia (SUM quantidade * custo_compra)';
COMMENT ON COLUMN okilao.metas_setor.lucro_realizado IS 'Lucro bruto realizado no dia (valor_realizado - custo_realizado)';

COMMENT ON COLUMN saoluiz.metas_setor.custo_realizado IS 'Custo total realizado no dia (SUM quantidade * custo_compra)';
COMMENT ON COLUMN saoluiz.metas_setor.lucro_realizado IS 'Lucro bruto realizado no dia (valor_realizado - custo_realizado)';

COMMENT ON COLUMN paraiso.metas_setor.custo_realizado IS 'Custo total realizado no dia (SUM quantidade * custo_compra)';
COMMENT ON COLUMN paraiso.metas_setor.lucro_realizado IS 'Lucro bruto realizado no dia (valor_realizado - custo_realizado)';

COMMENT ON COLUMN lucia.metas_setor.custo_realizado IS 'Custo total realizado no dia (SUM quantidade * custo_compra)';
COMMENT ON COLUMN lucia.metas_setor.lucro_realizado IS 'Lucro bruto realizado no dia (valor_realizado - custo_realizado)';

COMMENT ON COLUMN sol.metas_setor.custo_realizado IS 'Custo total realizado no dia (SUM quantidade * custo_compra)';
COMMENT ON COLUMN sol.metas_setor.lucro_realizado IS 'Lucro bruto realizado no dia (valor_realizado - custo_realizado)';
