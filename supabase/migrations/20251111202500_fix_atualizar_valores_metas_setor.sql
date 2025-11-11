-- Fix atualizar_valores_realizados_metas_setor function
-- Corrige referências às colunas corretas da tabela vendas

CREATE OR REPLACE FUNCTION public.atualizar_valores_realizados_metas_setor(
  p_schema text,
  p_setor_id bigint,
  p_mes integer,
  p_ano integer,
  p_filial_id bigint DEFAULT NULL
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
  -- Calcular primeiro e último dia do mês
  v_data_inicio := make_date(p_ano, p_mes, 1);
  v_data_fim := (v_data_inicio + interval '1 month' - interval '1 day')::date;

  RAISE NOTICE '[ATUALIZAR_METAS_SETOR] Schema: %, Setor: %, Período: % a %',
    p_schema, p_setor_id, v_data_inicio, v_data_fim;

  -- Atualizar valores realizados das metas por setor
  IF p_filial_id IS NULL THEN
    -- Atualizar para todas as filiais
    EXECUTE format('
      UPDATE %I.metas_setor ms
      SET
        valor_realizado = COALESCE((
          SELECT SUM(v.valor_vendas) - COALESCE(SUM(d.valor_desconto), 0)
          FROM %I.vendas v
          LEFT JOIN %I.descontos_venda d 
            ON d.data_desconto = v.data_venda 
            AND d.filial_id = v.filial_id
          WHERE v.data_venda = ms.data
            AND v.filial_id = ms.filial_id
            AND v.setor_id = ms.setor_id
        ), 0),
        diferenca = (
          COALESCE((
            SELECT SUM(v.valor_vendas) - COALESCE(SUM(d.valor_desconto), 0)
            FROM %I.vendas v
            LEFT JOIN %I.descontos_venda d 
              ON d.data_desconto = v.data_venda 
              AND d.filial_id = v.filial_id
            WHERE v.data_venda = ms.data
              AND v.filial_id = ms.filial_id
              AND v.setor_id = ms.setor_id
          ), 0) - COALESCE(ms.valor_meta, 0)
        ),
        diferenca_percentual = CASE
          WHEN COALESCE(ms.valor_meta, 0) > 0 THEN
            (((COALESCE((
              SELECT SUM(v.valor_vendas) - COALESCE(SUM(d.valor_desconto), 0)
              FROM %I.vendas v
              LEFT JOIN %I.descontos_venda d 
                ON d.data_desconto = v.data_venda 
                AND d.filial_id = v.filial_id
              WHERE v.data_venda = ms.data
                AND v.filial_id = ms.filial_id
                AND v.setor_id = ms.setor_id
            ), 0) - COALESCE(ms.valor_meta, 0)) / ms.valor_meta) * 100)
          ELSE 0
        END,
        updated_at = NOW()
      WHERE ms.setor_id = $1
        AND ms.data >= $2
        AND ms.data <= $3
    ', p_schema, p_schema, p_schema, p_schema, p_schema, p_schema, p_schema)
    USING p_setor_id, v_data_inicio, v_data_fim;

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    v_message := format('Valores atualizados com sucesso para %s metas do setor %s', 
      v_rows_updated, p_setor_id);
  ELSE
    -- Atualizar para filial específica
    EXECUTE format('
      UPDATE %I.metas_setor ms
      SET
        valor_realizado = COALESCE((
          SELECT SUM(v.valor_vendas) - COALESCE(SUM(d.valor_desconto), 0)
          FROM %I.vendas v
          LEFT JOIN %I.descontos_venda d 
            ON d.data_desconto = v.data_venda 
            AND d.filial_id = v.filial_id
          WHERE v.data_venda = ms.data
            AND v.filial_id = ms.filial_id
            AND v.setor_id = ms.setor_id
        ), 0),
        diferenca = (
          COALESCE((
            SELECT SUM(v.valor_vendas) - COALESCE(SUM(d.valor_desconto), 0)
            FROM %I.vendas v
            LEFT JOIN %I.descontos_venda d 
              ON d.data_desconto = v.data_venda 
              AND d.filial_id = v.filial_id
            WHERE v.data_venda = ms.data
              AND v.filial_id = ms.filial_id
              AND v.setor_id = ms.setor_id
          ), 0) - COALESCE(ms.valor_meta, 0)
        ),
        diferenca_percentual = CASE
          WHEN COALESCE(ms.valor_meta, 0) > 0 THEN
            (((COALESCE((
              SELECT SUM(v.valor_vendas) - COALESCE(SUM(d.valor_desconto), 0)
              FROM %I.vendas v
              LEFT JOIN %I.descontos_venda d 
                ON d.data_desconto = v.data_venda 
                AND d.filial_id = v.filial_id
              WHERE v.data_venda = ms.data
                AND v.filial_id = ms.filial_id
                AND v.setor_id = ms.setor_id
            ), 0) - COALESCE(ms.valor_meta, 0)) / ms.valor_meta) * 100)
          ELSE 0
        END,
        updated_at = NOW()
      WHERE ms.setor_id = $1
        AND ms.data >= $2
        AND ms.data <= $3
        AND ms.filial_id = $4
    ', p_schema, p_schema, p_schema, p_schema, p_schema, p_schema, p_schema)
    USING p_setor_id, v_data_inicio, v_data_fim, p_filial_id;

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    v_message := format('Valores atualizados com sucesso para %s metas do setor %s na filial %s', 
      v_rows_updated, p_setor_id, p_filial_id);
  END IF;

  RAISE NOTICE '[ATUALIZAR_METAS_SETOR] %', v_message;

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
    RAISE NOTICE '[ATUALIZAR_METAS_SETOR] Erro: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Erro ao atualizar valores: ' || SQLERRM,
      'rows_updated', 0
    );
END;
$function$;
