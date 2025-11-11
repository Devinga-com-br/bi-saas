-- Corrigir função atualizar_valores_realizados_metas
-- Fix: adicionar USING clause para passar parâmetros

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
  -- Calcular primeiro e último dia do mês
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
    ', p_schema, p_schema, p_schema, p_schema, p_schema, p_schema, p_schema)
    USING v_data_inicio, v_data_fim;

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    v_message := format('Valores atualizados com sucesso para %s metas', v_rows_updated);
  ELSE
    -- Atualizar para filial específica
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
    ', p_schema, p_schema, p_schema, p_schema, p_schema, p_schema, p_schema)
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
