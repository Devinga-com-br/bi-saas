-- Migration: Adicionar Lucro Bruto e Margem Bruta ao Modulo Metas Mensais
-- Data: 2025-12-16
-- Descricao: Adiciona campos custo_realizado e lucro_realizado na tabela metas_mensais
--            e atualiza as funcoes RPC para calcular e retornar esses valores

-- ============================================================================
-- FASE 1: ALTER TABLE - Adicionar colunas em todos os schemas
-- ============================================================================

-- Schema: okilao
ALTER TABLE okilao.metas_mensais
ADD COLUMN IF NOT EXISTS custo_realizado NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS lucro_realizado NUMERIC(15, 2) DEFAULT 0;

-- Schema: saoluiz
ALTER TABLE saoluiz.metas_mensais
ADD COLUMN IF NOT EXISTS custo_realizado NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS lucro_realizado NUMERIC(15, 2) DEFAULT 0;

-- Schema: paraiso
ALTER TABLE paraiso.metas_mensais
ADD COLUMN IF NOT EXISTS custo_realizado NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS lucro_realizado NUMERIC(15, 2) DEFAULT 0;

-- Schema: lucia
ALTER TABLE lucia.metas_mensais
ADD COLUMN IF NOT EXISTS custo_realizado NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS lucro_realizado NUMERIC(15, 2) DEFAULT 0;

-- Schema: sol
ALTER TABLE sol.metas_mensais
ADD COLUMN IF NOT EXISTS custo_realizado NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS lucro_realizado NUMERIC(15, 2) DEFAULT 0;

-- ============================================================================
-- FASE 2: UPDATE FUNCTION - atualizar_valores_realizados_metas
-- ============================================================================
-- Adiciona calculo de custo_realizado e lucro_realizado

CREATE OR REPLACE FUNCTION public.atualizar_valores_realizados_metas(
  p_schema text,
  p_mes integer,
  p_ano integer,
  p_filial_id bigint DEFAULT NULL::bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_data_inicio date;
  v_data_fim date;
  v_rows_updated integer := 0;
  v_message text;
BEGIN
  -- Calcular primeiro e ultimo dia do mes
  v_data_inicio := make_date(p_ano, p_mes, 1);
  v_data_fim := (v_data_inicio + interval '1 month' - interval '1 day')::date;

  -- Atualizar valores realizados das metas
  IF p_filial_id IS NULL THEN
    -- Atualizar para todas as filiais
    EXECUTE format('
      UPDATE %I.metas_mensais mm
      SET
        valor_realizado = (
          COALESCE((
            SELECT SUM(v.valor_vendas)
            FROM %I.vendas v
            WHERE v.data_venda = mm.data
              AND v.filial_id = mm.filial_id
          ), 0) - COALESCE((
            SELECT SUM(d.valor_desconto)
            FROM %I.descontos_venda d
            WHERE d.data_desconto = mm.data
              AND d.filial_id = mm.filial_id
          ), 0)
        ),
        custo_realizado = COALESCE((
          SELECT SUM(v.quantidade * v.custo_compra)
          FROM %I.vendas v
          WHERE v.data_venda = mm.data
            AND v.filial_id = mm.filial_id
        ), 0),
        lucro_realizado = (
          COALESCE((
            SELECT SUM(v.valor_vendas)
            FROM %I.vendas v
            WHERE v.data_venda = mm.data
              AND v.filial_id = mm.filial_id
          ), 0) - COALESCE((
            SELECT SUM(d.valor_desconto)
            FROM %I.descontos_venda d
            WHERE d.data_desconto = mm.data
              AND d.filial_id = mm.filial_id
          ), 0)
        ) - COALESCE((
          SELECT SUM(v.quantidade * v.custo_compra)
          FROM %I.vendas v
          WHERE v.data_venda = mm.data
            AND v.filial_id = mm.filial_id
        ), 0),
        diferenca = (
          (COALESCE((
            SELECT SUM(v.valor_vendas)
            FROM %I.vendas v
            WHERE v.data_venda = mm.data
              AND v.filial_id = mm.filial_id
          ), 0) - COALESCE((
            SELECT SUM(d.valor_desconto)
            FROM %I.descontos_venda d
            WHERE d.data_desconto = mm.data
              AND d.filial_id = mm.filial_id
          ), 0)) - mm.valor_meta
        ),
        diferenca_percentual = CASE
          WHEN mm.valor_meta > 0 THEN
            ((((COALESCE((
              SELECT SUM(v.valor_vendas)
              FROM %I.vendas v
              WHERE v.data_venda = mm.data
                AND v.filial_id = mm.filial_id
            ), 0) - COALESCE((
              SELECT SUM(d.valor_desconto)
              FROM %I.descontos_venda d
              WHERE d.data_desconto = mm.data
                AND d.filial_id = mm.filial_id
            ), 0)) - mm.valor_meta) / mm.valor_meta) * 100)
          ELSE 0
        END,
        updated_at = NOW()
      WHERE mm.data >= $1
        AND mm.data <= $2
    ', p_schema, p_schema, p_schema, p_schema, p_schema, p_schema, p_schema, p_schema, p_schema, p_schema, p_schema)
    USING v_data_inicio, v_data_fim;

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    v_message := format('Valores atualizados com sucesso para %s metas', v_rows_updated);
  ELSE
    -- Atualizar para filial especifica
    EXECUTE format('
      UPDATE %I.metas_mensais mm
      SET
        valor_realizado = (
          COALESCE((
            SELECT SUM(v.valor_vendas)
            FROM %I.vendas v
            WHERE v.data_venda = mm.data
              AND v.filial_id = mm.filial_id
          ), 0) - COALESCE((
            SELECT SUM(d.valor_desconto)
            FROM %I.descontos_venda d
            WHERE d.data_desconto = mm.data
              AND d.filial_id = mm.filial_id
          ), 0)
        ),
        custo_realizado = COALESCE((
          SELECT SUM(v.quantidade * v.custo_compra)
          FROM %I.vendas v
          WHERE v.data_venda = mm.data
            AND v.filial_id = mm.filial_id
        ), 0),
        lucro_realizado = (
          COALESCE((
            SELECT SUM(v.valor_vendas)
            FROM %I.vendas v
            WHERE v.data_venda = mm.data
              AND v.filial_id = mm.filial_id
          ), 0) - COALESCE((
            SELECT SUM(d.valor_desconto)
            FROM %I.descontos_venda d
            WHERE d.data_desconto = mm.data
              AND d.filial_id = mm.filial_id
          ), 0)
        ) - COALESCE((
          SELECT SUM(v.quantidade * v.custo_compra)
          FROM %I.vendas v
          WHERE v.data_venda = mm.data
            AND v.filial_id = mm.filial_id
        ), 0),
        diferenca = (
          (COALESCE((
            SELECT SUM(v.valor_vendas)
            FROM %I.vendas v
            WHERE v.data_venda = mm.data
              AND v.filial_id = mm.filial_id
          ), 0) - COALESCE((
            SELECT SUM(d.valor_desconto)
            FROM %I.descontos_venda d
            WHERE d.data_desconto = mm.data
              AND d.filial_id = mm.filial_id
          ), 0)) - mm.valor_meta
        ),
        diferenca_percentual = CASE
          WHEN mm.valor_meta > 0 THEN
            ((((COALESCE((
              SELECT SUM(v.valor_vendas)
              FROM %I.vendas v
              WHERE v.data_venda = mm.data
                AND v.filial_id = mm.filial_id
            ), 0) - COALESCE((
              SELECT SUM(d.valor_desconto)
              FROM %I.descontos_venda d
              WHERE d.data_desconto = mm.data
                AND d.filial_id = mm.filial_id
            ), 0)) - mm.valor_meta) / mm.valor_meta) * 100)
          ELSE 0
        END,
        updated_at = NOW()
      WHERE mm.data >= $1
        AND mm.data <= $2
        AND mm.filial_id = $3
    ', p_schema, p_schema, p_schema, p_schema, p_schema, p_schema, p_schema, p_schema, p_schema, p_schema, p_schema)
    USING v_data_inicio, v_data_fim, p_filial_id;

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    v_message := format('Valores atualizados com sucesso para %s metas da filial %s', v_rows_updated, p_filial_id);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', v_message,
    'rows_updated', v_rows_updated,
    'periodo', jsonb_build_object(
      'mes', p_mes,
      'ano', p_ano,
      'data_inicio', v_data_inicio,
      'data_fim', v_data_fim
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Erro ao atualizar valores: ' || SQLERRM,
      'rows_updated', 0
    );
END;
$function$;

-- ============================================================================
-- FASE 3: UPDATE FUNCTION - get_metas_mensais_report
-- ============================================================================
-- Adiciona custo_realizado, lucro_realizado e totais agregados

CREATE OR REPLACE FUNCTION public.get_metas_mensais_report(
  p_schema text,
  p_mes integer,
  p_ano integer,
  p_filial_id integer DEFAULT NULL::integer,
  p_filial_ids integer[] DEFAULT NULL::integer[]
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_result JSON;
    v_query TEXT;
    v_filial_filter TEXT;
    v_data_inicio DATE;
    v_data_fim DATE;
BEGIN
    -- Validar schema
    IF p_schema IS NULL OR p_schema = '' THEN
        RAISE EXCEPTION 'Schema nao informado';
    END IF;

    -- Calcular data de inicio e fim do mes (SEMPRE do dia 1 ao ultimo dia)
    v_data_inicio := make_date(p_ano, p_mes, 1);
    v_data_fim := (v_data_inicio + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

    -- Montar filtro de filial
    IF p_filial_ids IS NOT NULL AND array_length(p_filial_ids, 1) > 0 THEN
        v_filial_filter := format('AND m.filial_id = ANY($1)');
    ELSIF p_filial_id IS NOT NULL THEN
        v_filial_filter := format('AND m.filial_id = %s', p_filial_id);
    ELSE
        v_filial_filter := '';
    END IF;

    -- Query principal com novos campos de custo e lucro
    v_query := format($query$
        WITH metas_periodo AS (
            SELECT
                m.id,
                m.filial_id,
                m.data,
                CASE EXTRACT(DOW FROM m.data)
                    WHEN 0 THEN 'Domingo'
                    WHEN 1 THEN 'Segunda'
                    WHEN 2 THEN 'Terca'
                    WHEN 3 THEN 'Quarta'
                    WHEN 4 THEN 'Quinta'
                    WHEN 5 THEN 'Sexta'
                    WHEN 6 THEN 'Sabado'
                END as dia_semana,
                m.meta_percentual,
                m.data_referencia,
                m.valor_referencia,
                m.valor_meta,
                COALESCE(m.valor_realizado, 0) as valor_realizado,
                COALESCE(m.custo_realizado, 0) as custo_realizado,
                COALESCE(m.lucro_realizado, 0) as lucro_realizado,
                (COALESCE(m.valor_realizado, 0) - m.valor_meta) as diferenca,
                CASE
                    WHEN m.valor_meta > 0 THEN
                        ((COALESCE(m.valor_realizado, 0) - m.valor_meta) / m.valor_meta * 100)
                    ELSE 0
                END as diferenca_percentual
            FROM %I.metas_mensais m
            WHERE m.data >= $2
              AND m.data <= $3
              %s
            ORDER BY m.data, m.filial_id
        ),
        totais AS (
            SELECT
                COALESCE(SUM(valor_realizado), 0) as total_realizado,
                COALESCE(SUM(valor_meta), 0) as total_meta,
                COALESCE(SUM(custo_realizado), 0) as total_custo,
                COALESCE(SUM(lucro_realizado), 0) as total_lucro,
                CASE
                    WHEN SUM(valor_meta) > 0 THEN
                        (SUM(valor_realizado) / SUM(valor_meta) * 100)
                    ELSE 0
                END as percentual_atingido,
                CASE
                    WHEN SUM(valor_realizado) > 0 THEN
                        (SUM(lucro_realizado) / SUM(valor_realizado) * 100)
                    ELSE 0
                END as margem_bruta
            FROM metas_periodo
        )
        SELECT json_build_object(
            'metas', COALESCE((SELECT json_agg(row_to_json(metas_periodo)) FROM metas_periodo), '[]'::json),
            'total_realizado', (SELECT total_realizado FROM totais),
            'total_meta', (SELECT total_meta FROM totais),
            'total_custo', (SELECT total_custo FROM totais),
            'total_lucro', (SELECT total_lucro FROM totais),
            'percentual_atingido', (SELECT percentual_atingido FROM totais),
            'margem_bruta', (SELECT margem_bruta FROM totais)
        )
    $query$, p_schema, v_filial_filter);

    -- Executar query
    IF p_filial_ids IS NOT NULL AND array_length(p_filial_ids, 1) > 0 THEN
        EXECUTE v_query INTO v_result USING p_filial_ids, v_data_inicio, v_data_fim;
    ELSE
        EXECUTE v_query INTO v_result USING v_data_inicio, v_data_fim;
    END IF;

    RETURN COALESCE(v_result, json_build_object(
        'metas', '[]'::json,
        'total_realizado', 0,
        'total_meta', 0,
        'total_custo', 0,
        'total_lucro', 0,
        'percentual_atingido', 0,
        'margem_bruta', 0
    ));

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Erro ao buscar metas: %', SQLERRM;
END;
$function$;

-- ============================================================================
-- COMENTARIOS
-- ============================================================================
COMMENT ON COLUMN okilao.metas_mensais.custo_realizado IS 'Custo total realizado no dia (SUM quantidade * custo_compra)';
COMMENT ON COLUMN okilao.metas_mensais.lucro_realizado IS 'Lucro bruto realizado no dia (valor_realizado - custo_realizado)';

COMMENT ON COLUMN saoluiz.metas_mensais.custo_realizado IS 'Custo total realizado no dia (SUM quantidade * custo_compra)';
COMMENT ON COLUMN saoluiz.metas_mensais.lucro_realizado IS 'Lucro bruto realizado no dia (valor_realizado - custo_realizado)';

COMMENT ON COLUMN paraiso.metas_mensais.custo_realizado IS 'Custo total realizado no dia (SUM quantidade * custo_compra)';
COMMENT ON COLUMN paraiso.metas_mensais.lucro_realizado IS 'Lucro bruto realizado no dia (valor_realizado - custo_realizado)';

COMMENT ON COLUMN lucia.metas_mensais.custo_realizado IS 'Custo total realizado no dia (SUM quantidade * custo_compra)';
COMMENT ON COLUMN lucia.metas_mensais.lucro_realizado IS 'Lucro bruto realizado no dia (valor_realizado - custo_realizado)';

COMMENT ON COLUMN sol.metas_mensais.custo_realizado IS 'Custo total realizado no dia (SUM quantidade * custo_compra)';
COMMENT ON COLUMN sol.metas_mensais.lucro_realizado IS 'Lucro bruto realizado no dia (valor_realizado - custo_realizado)';
