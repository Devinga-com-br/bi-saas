-- Migration: Create functions for sector-based goals
-- Description: Functions to generate and retrieve sector goals

-- 1. Function to generate sector goals
CREATE OR REPLACE FUNCTION public.generate_metas_setores(
  p_schema text,
  p_setor_id bigint,
  p_filial_id bigint,
  p_mes integer,
  p_ano integer,
  p_meta_percentual numeric,
  p_data_referencia_inicial date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_dias_no_mes integer;
  v_data_atual date;
  v_data_referencia date;
  v_dia_semana text;
  v_valor_referencia numeric;
  v_valor_meta numeric;
  v_valor_realizado numeric;
  v_diferenca numeric;
  v_diferenca_percentual numeric;
  v_departamento_ids bigint[];
  v_departamento_nivel smallint;
  v_count integer := 0;
BEGIN
  -- Get setor configuration
  EXECUTE format('
    SELECT departamento_ids, departamento_nivel
    FROM %I.setores
    WHERE id = $1 AND ativo = true
  ', p_schema)
  INTO v_departamento_ids, v_departamento_nivel
  USING p_setor_id;

  IF v_departamento_ids IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Setor não encontrado ou inativo');
  END IF;

  -- Get number of days in month
  v_dias_no_mes := EXTRACT(DAY FROM (DATE_TRUNC('month', make_date(p_ano, p_mes, 1)) + INTERVAL '1 month - 1 day'));

  -- Delete existing metas for this setor/filial/month
  EXECUTE format('
    DELETE FROM %I.metas_setores
    WHERE setor_id = $1 
      AND filial_id = $2
      AND EXTRACT(MONTH FROM data) = $3
      AND EXTRACT(YEAR FROM data) = $4
  ', p_schema)
  USING p_setor_id, p_filial_id, p_mes, p_ano;

  -- Generate goals for each day
  FOR i IN 1..v_dias_no_mes LOOP
    v_data_atual := make_date(p_ano, p_mes, i);
    v_data_referencia := p_data_referencia_inicial + (i - 1);
    
    -- Get day of week in Portuguese
    v_dia_semana := CASE EXTRACT(DOW FROM v_data_atual)
      WHEN 0 THEN 'Domingo'
      WHEN 1 THEN 'Segunda-Feira'
      WHEN 2 THEN 'Terça-Feira'
      WHEN 3 THEN 'Quarta-Feira'
      WHEN 4 THEN 'Quinta-Feira'
      WHEN 5 THEN 'Sexta-Feira'
      WHEN 6 THEN 'Sábado'
    END;

    -- Get reference value (sum of sales for products in the sector's departments)
    EXECUTE format('
      SELECT COALESCE(SUM(v.valor_vendas), 0)
      FROM %I.vendas v
      INNER JOIN %I.produtos p ON v.id_produto = p.id AND v.filial_id = p.filial_id
      WHERE v.filial_id = $1
        AND v.data_venda = $2
        AND p.departamento_id = ANY($3)
        AND p.departamento_nivel = $4
    ', p_schema, p_schema)
    INTO v_valor_referencia
    USING p_filial_id, v_data_referencia, v_departamento_ids, v_departamento_nivel;

    -- Calculate goal value
    IF v_valor_referencia > 0 THEN
      v_valor_meta := v_valor_referencia * (1 + p_meta_percentual / 100);
    ELSE
      v_valor_meta := NULL;
    END IF;

    -- Get actual value
    EXECUTE format('
      SELECT COALESCE(SUM(v.valor_vendas), 0)
      FROM %I.vendas v
      INNER JOIN %I.produtos p ON v.id_produto = p.id AND v.filial_id = p.filial_id
      WHERE v.filial_id = $1
        AND v.data_venda = $2
        AND p.departamento_id = ANY($3)
        AND p.departamento_nivel = $4
    ', p_schema, p_schema)
    INTO v_valor_realizado
    USING p_filial_id, v_data_atual, v_departamento_ids, v_departamento_nivel;

    -- Calculate difference
    IF v_valor_meta IS NOT NULL AND v_valor_realizado IS NOT NULL THEN
      v_diferenca := v_valor_realizado - v_valor_meta;
      IF v_valor_meta > 0 THEN
        v_diferenca_percentual := (v_diferenca / v_valor_meta) * 100;
      ELSE
        v_diferenca_percentual := 0;
      END IF;
    ELSE
      v_diferenca := NULL;
      v_diferenca_percentual := NULL;
    END IF;

    -- Insert goal
    EXECUTE format('
      INSERT INTO %I.metas_setores (
        setor_id, filial_id, data, dia_semana, meta_percentual,
        data_referencia, valor_referencia, valor_meta,
        valor_realizado, diferenca, diferenca_percentual
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (setor_id, filial_id, data) 
      DO UPDATE SET
        dia_semana = EXCLUDED.dia_semana,
        meta_percentual = EXCLUDED.meta_percentual,
        data_referencia = EXCLUDED.data_referencia,
        valor_referencia = EXCLUDED.valor_referencia,
        valor_meta = EXCLUDED.valor_meta,
        valor_realizado = EXCLUDED.valor_realizado,
        diferenca = EXCLUDED.diferenca,
        diferenca_percentual = EXCLUDED.diferenca_percentual,
        updated_at = now()
    ', p_schema)
    USING p_setor_id, p_filial_id, v_data_atual, v_dia_semana, p_meta_percentual,
          v_data_referencia, v_valor_referencia, v_valor_meta,
          v_valor_realizado, v_diferenca, v_diferenca_percentual;

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'metas_geradas', v_count,
    'mes', p_mes,
    'ano', p_ano,
    'setor_id', p_setor_id,
    'filial_id', p_filial_id
  );
END;
$$;

-- 2. Function to get sector goals report
CREATE OR REPLACE FUNCTION public.get_metas_setores_report(
  p_schema text,
  p_mes integer,
  p_ano integer,
  p_setor_id bigint DEFAULT NULL,
  p_filial_id bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  EXECUTE format('
    SELECT jsonb_agg(
      jsonb_build_object(
        ''id'', m.id,
        ''setor_id'', m.setor_id,
        ''setor_nome'', s.nome,
        ''filial_id'', m.filial_id,
        ''data'', m.data,
        ''dia_semana'', m.dia_semana,
        ''meta_percentual'', m.meta_percentual,
        ''data_referencia'', m.data_referencia,
        ''valor_referencia'', m.valor_referencia,
        ''valor_meta'', m.valor_meta,
        ''valor_realizado'', m.valor_realizado,
        ''diferenca'', m.diferenca,
        ''diferenca_percentual'', COALESCE(m.diferenca_percentual, 0)
      ) ORDER BY s.nome, m.data, m.filial_id
    )
    FROM %I.metas_setores m
    INNER JOIN %I.setores s ON m.setor_id = s.id
    WHERE EXTRACT(MONTH FROM m.data) = $1
      AND EXTRACT(YEAR FROM m.data) = $2
      AND ($3::bigint IS NULL OR m.setor_id = $3)
      AND ($4::bigint IS NULL OR m.filial_id = $4)
  ', p_schema, p_schema)
  INTO v_result
  USING p_mes, p_ano, p_setor_id, p_filial_id;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;
