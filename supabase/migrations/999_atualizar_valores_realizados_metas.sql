-- Migration: Atualizar valores realizados das metas
-- Description: Função para recalcular valor_realizado nas metas mensais

CREATE OR REPLACE FUNCTION public.atualizar_valores_realizados_metas(
  p_schema text,
  p_mes integer,
  p_ano integer,
  p_filial_id bigint DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_rows_updated integer := 0;
  v_data_inicio date;
  v_data_fim date;
BEGIN
  -- Calcular primeiro e último dia do mês
  v_data_inicio := make_date(p_ano, p_mes, 1);
  v_data_fim := (v_data_inicio + interval '1 month' - interval '1 day')::date;
  
  -- Atualizar valor_realizado para cada meta
  IF p_filial_id IS NULL THEN
    -- Atualizar todas as filiais
    EXECUTE format('
      UPDATE %I.metas_mensais m
      SET 
        valor_realizado = COALESCE((
          SELECT SUM(v.valor_vendas)
          FROM %I.vendas v
          WHERE v.data_venda = m.data
            AND v.filial_id = m.filial_id
        ), 0),
        diferenca = (
          COALESCE((
            SELECT SUM(v.valor_vendas)
            FROM %I.vendas v
            WHERE v.data_venda = m.data
              AND v.filial_id = m.filial_id
          ), 0) - m.valor_meta
        ),
        diferenca_percentual = CASE 
          WHEN m.valor_meta > 0 THEN
            ((COALESCE((
              SELECT SUM(v.valor_vendas)
              FROM %I.vendas v
              WHERE v.data_venda = m.data
                AND v.filial_id = m.filial_id
            ), 0) - m.valor_meta) / m.valor_meta) * 100
          ELSE 0
        END
      WHERE m.data >= $1 AND m.data <= $2
        AND m.data <= CURRENT_DATE
    ', p_schema, p_schema, p_schema, p_schema)
    USING v_data_inicio, v_data_fim;
  ELSE
    -- Atualizar apenas uma filial
    EXECUTE format('
      UPDATE %I.metas_mensais m
      SET 
        valor_realizado = COALESCE((
          SELECT SUM(v.valor_vendas)
          FROM %I.vendas v
          WHERE v.data_venda = m.data
            AND v.filial_id = m.filial_id
        ), 0),
        diferenca = (
          COALESCE((
            SELECT SUM(v.valor_vendas)
            FROM %I.vendas v
            WHERE v.data_venda = m.data
              AND v.filial_id = m.filial_id
          ), 0) - m.valor_meta
        ),
        diferenca_percentual = CASE 
          WHEN m.valor_meta > 0 THEN
            ((COALESCE((
              SELECT SUM(v.valor_vendas)
              FROM %I.vendas v
              WHERE v.data_venda = m.data
                AND v.filial_id = m.filial_id
            ), 0) - m.valor_meta) / m.valor_meta) * 100
          ELSE 0
        END
      WHERE m.data >= $1 AND m.data <= $2
        AND m.filial_id = $3
        AND m.data <= CURRENT_DATE
    ', p_schema, p_schema, p_schema, p_schema)
    USING v_data_inicio, v_data_fim, p_filial_id;
  END IF;
  
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'rows_updated', v_rows_updated,
    'message', format('Atualizado %s registros', v_rows_updated)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
