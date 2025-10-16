-- Migration: Fix metas report to calculate realtime values
-- Description: Update get_metas_mensais_report to recalculate valores realizados from vendas table

DROP FUNCTION IF EXISTS public.get_metas_mensais_report(text, integer, integer, bigint);

CREATE OR REPLACE FUNCTION public.get_metas_mensais_report(
  p_schema text,
  p_mes integer,
  p_ano integer,
  p_filial_id bigint DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_metas jsonb;
  v_total_realizado numeric(15, 2);
  v_total_meta numeric(15, 2);
  v_percentual_atingido numeric(5, 2);
  v_data_inicio date;
  v_data_fim date;
BEGIN
  -- Calcular primeiro e último dia do mês
  v_data_inicio := make_date(p_ano, p_mes, 1);
  v_data_fim := (v_data_inicio + interval '1 month' - interval '1 day')::date;
  
  -- Buscar metas do período com valores recalculados em tempo real
  IF p_filial_id IS NULL THEN
    EXECUTE format('
      SELECT jsonb_agg(row_to_json(m))
      FROM (
        SELECT 
          mm.id, 
          mm.filial_id, 
          mm.data, 
          mm.dia_semana, 
          mm.meta_percentual,
          mm.data_referencia, 
          mm.valor_referencia, 
          mm.valor_meta,
          COALESCE((
            SELECT SUM(v.valor_vendas)
            FROM %I.vendas v
            WHERE v.data_venda = mm.data
              AND v.filial_id = mm.filial_id
          ), 0)::numeric(15,2) as valor_realizado,
          (COALESCE((
            SELECT SUM(v.valor_vendas)
            FROM %I.vendas v
            WHERE v.data_venda = mm.data
              AND v.filial_id = mm.filial_id
          ), 0) - mm.valor_meta)::numeric(15,2) as diferenca,
          CASE 
            WHEN mm.valor_meta > 0 THEN
              (((COALESCE((
                SELECT SUM(v.valor_vendas)
                FROM %I.vendas v
                WHERE v.data_venda = mm.data
                  AND v.filial_id = mm.filial_id
              ), 0) - mm.valor_meta) / mm.valor_meta) * 100)::numeric(5,2)
            ELSE 0
          END as diferenca_percentual
        FROM %I.metas_mensais mm
        WHERE mm.data >= $1 AND mm.data <= $2
        ORDER BY mm.data ASC
      ) m
    ', p_schema, p_schema, p_schema, p_schema)
    INTO v_metas
    USING v_data_inicio, v_data_fim;
  ELSE
    EXECUTE format('
      SELECT jsonb_agg(row_to_json(m))
      FROM (
        SELECT 
          mm.id, 
          mm.filial_id, 
          mm.data, 
          mm.dia_semana, 
          mm.meta_percentual,
          mm.data_referencia, 
          mm.valor_referencia, 
          mm.valor_meta,
          COALESCE((
            SELECT SUM(v.valor_vendas)
            FROM %I.vendas v
            WHERE v.data_venda = mm.data
              AND v.filial_id = mm.filial_id
          ), 0)::numeric(15,2) as valor_realizado,
          (COALESCE((
            SELECT SUM(v.valor_vendas)
            FROM %I.vendas v
            WHERE v.data_venda = mm.data
              AND v.filial_id = mm.filial_id
          ), 0) - mm.valor_meta)::numeric(15,2) as diferenca,
          CASE 
            WHEN mm.valor_meta > 0 THEN
              (((COALESCE((
                SELECT SUM(v.valor_vendas)
                FROM %I.vendas v
                WHERE v.data_venda = mm.data
                  AND v.filial_id = mm.filial_id
              ), 0) - mm.valor_meta) / mm.valor_meta) * 100)::numeric(5,2)
            ELSE 0
          END as diferenca_percentual
        FROM %I.metas_mensais mm
        WHERE mm.data >= $1 AND mm.data <= $2
          AND mm.filial_id = $3
        ORDER BY mm.data ASC
      ) m
    ', p_schema, p_schema, p_schema, p_schema)
    INTO v_metas
    USING v_data_inicio, v_data_fim, p_filial_id;
  END IF;
  
  -- Calcular totais até a data atual
  IF p_filial_id IS NULL THEN
    EXECUTE format('
      SELECT 
        COALESCE(SUM(vendas_dia.total_vendas), 0),
        COALESCE(SUM(mm.valor_meta), 0)
      FROM %I.metas_mensais mm
      LEFT JOIN (
        SELECT v.data_venda, v.filial_id, SUM(v.valor_vendas) as total_vendas
        FROM %I.vendas v
        WHERE v.data_venda >= $1 AND v.data_venda <= $2
          AND v.data_venda <= CURRENT_DATE
        GROUP BY v.data_venda, v.filial_id
      ) vendas_dia ON vendas_dia.data_venda = mm.data 
        AND vendas_dia.filial_id = mm.filial_id
      WHERE mm.data >= $1 AND mm.data <= $2
        AND mm.data <= CURRENT_DATE
    ', p_schema, p_schema)
    INTO v_total_realizado, v_total_meta
    USING v_data_inicio, v_data_fim;
  ELSE
    EXECUTE format('
      SELECT 
        COALESCE(SUM(vendas_dia.total_vendas), 0),
        COALESCE(SUM(mm.valor_meta), 0)
      FROM %I.metas_mensais mm
      LEFT JOIN (
        SELECT v.data_venda, v.filial_id, SUM(v.valor_vendas) as total_vendas
        FROM %I.vendas v
        WHERE v.data_venda >= $1 AND v.data_venda <= $2
          AND v.filial_id = $3
          AND v.data_venda <= CURRENT_DATE
        GROUP BY v.data_venda, v.filial_id
      ) vendas_dia ON vendas_dia.data_venda = mm.data 
        AND vendas_dia.filial_id = mm.filial_id
      WHERE mm.data >= $1 AND mm.data <= $2
        AND mm.filial_id = $3
        AND mm.data <= CURRENT_DATE
    ', p_schema, p_schema)
    INTO v_total_realizado, v_total_meta
    USING v_data_inicio, v_data_fim, p_filial_id;
  END IF;
  
  -- Calcular percentual atingido
  IF v_total_meta > 0 THEN
    v_percentual_atingido := (v_total_realizado / v_total_meta) * 100;
  ELSE
    v_percentual_atingido := 0;
  END IF;
  
  -- Montar resultado
  v_result := jsonb_build_object(
    'metas', COALESCE(v_metas, '[]'::jsonb),
    'total_realizado', v_total_realizado,
    'total_meta', v_total_meta,
    'percentual_atingido', v_percentual_atingido
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
