-- Migration: Fix column name in generate_metas_setor function
-- Description: Change nivel_departamento to departamento_nivel to match table structure

DROP FUNCTION IF EXISTS public.generate_metas_setor(TEXT, BIGINT, BIGINT, INT, INT, NUMERIC, DATE);

CREATE OR REPLACE FUNCTION public.generate_metas_setor(
  p_schema TEXT,
  p_setor_id BIGINT,
  p_filial_id BIGINT,
  p_mes INT,
  p_ano INT,
  p_meta_percentual NUMERIC,
  p_data_referencia_inicial DATE
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_dias_no_mes INT;
  v_current_date DATE;
  v_data_referencia DATE;
  v_dia_semana TEXT;
  v_dia_semana_ref TEXT;
  v_valor_referencia NUMERIC;
  v_valor_meta NUMERIC;
  v_valor_realizado NUMERIC;
  v_diferenca NUMERIC;
  v_diferenca_percentual NUMERIC;
  v_setor RECORD;
  v_nivel INT;
  v_dept_ids BIGINT[];
  v_rows_inserted INT := 0;
BEGIN
  -- Get setor info (FIXED: departamento_nivel instead of nivel_departamento)
  EXECUTE format('
    SELECT departamento_nivel, departamento_ids 
    FROM %I.setores 
    WHERE id = $1
  ', p_schema) 
  INTO v_setor
  USING p_setor_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Setor não encontrado');
  END IF;

  v_nivel := v_setor.departamento_nivel;
  v_dept_ids := v_setor.departamento_ids;

  -- Get days in month
  v_dias_no_mes := EXTRACT(DAY FROM (DATE_TRUNC('month', MAKE_DATE(p_ano, p_mes, 1)) + INTERVAL '1 month' - INTERVAL '1 day'));

  -- Delete existing metas for this setor, filial and month
  EXECUTE format('
    DELETE FROM %I.metas_setor 
    WHERE setor_id = $1 
    AND filial_id = $2 
    AND EXTRACT(MONTH FROM data) = $3 
    AND EXTRACT(YEAR FROM data) = $4
  ', p_schema)
  USING p_setor_id, p_filial_id, p_mes, p_ano;

  -- Loop through each day of the month
  FOR i IN 1..v_dias_no_mes LOOP
    v_current_date := MAKE_DATE(p_ano, p_mes, i);
    v_data_referencia := p_data_referencia_inicial + (i - 1);
    
    -- Get day of week in Portuguese for current date
    v_dia_semana := CASE EXTRACT(DOW FROM v_current_date)
      WHEN 0 THEN 'Domingo'
      WHEN 1 THEN 'Segunda-Feira'
      WHEN 2 THEN 'Terça-Feira'
      WHEN 3 THEN 'Quarta-Feira'
      WHEN 4 THEN 'Quinta-Feira'
      WHEN 5 THEN 'Sexta-Feira'
      WHEN 6 THEN 'Sábado'
    END;

    -- Get day of week in Portuguese for reference date
    v_dia_semana_ref := CASE EXTRACT(DOW FROM v_data_referencia)
      WHEN 0 THEN 'Domingo'
      WHEN 1 THEN 'Segunda-Feira'
      WHEN 2 THEN 'Terça-Feira'
      WHEN 3 THEN 'Quarta-Feira'
      WHEN 4 THEN 'Quinta-Feira'
      WHEN 5 THEN 'Sexta-Feira'
      WHEN 6 THEN 'Sábado'
    END;

    -- Calculate reference value (sum of sales from products in the sector's departments)
    EXECUTE format('
      SELECT COALESCE(SUM(v.valor_vendas), 0)
      FROM %I.vendas v
      INNER JOIN %I.produtos p ON v.id_produto = p.id AND v.filial_id = p.filial_id
      WHERE v.filial_id = $1
      AND v.data_venda = $2
      AND p.departamento_id = ANY($3)
    ', p_schema, p_schema)
    INTO v_valor_referencia
    USING p_filial_id, v_data_referencia, v_dept_ids;

    -- Calculate meta value
    IF v_valor_referencia IS NOT NULL AND v_valor_referencia > 0 THEN
      v_valor_meta := v_valor_referencia * (1 + (p_meta_percentual / 100));
    ELSE
      v_valor_meta := NULL;
    END IF;

    -- Get realized value
    EXECUTE format('
      SELECT COALESCE(SUM(v.valor_vendas), 0)
      FROM %I.vendas v
      INNER JOIN %I.produtos p ON v.id_produto = p.id AND v.filial_id = p.filial_id
      WHERE v.filial_id = $1
      AND v.data_venda = $2
      AND p.departamento_id = ANY($3)
    ', p_schema, p_schema)
    INTO v_valor_realizado
    USING p_filial_id, v_current_date, v_dept_ids;

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
      v_diferenca_percentual := 0;
    END IF;

    -- Insert meta (with dia_semana_ref)
    EXECUTE format('
      INSERT INTO %I.metas_setor (
        setor_id, filial_id, data, dia_semana, meta_percentual,
        data_referencia, dia_semana_ref, valor_referencia, valor_meta,
        valor_realizado, diferenca, diferenca_percentual
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ', p_schema)
    USING p_setor_id, p_filial_id, v_current_date, v_dia_semana, p_meta_percentual,
          v_data_referencia, v_dia_semana_ref, v_valor_referencia, v_valor_meta,
          v_valor_realizado, v_diferenca, v_diferenca_percentual;

    v_rows_inserted := v_rows_inserted + 1;
  END LOOP;

  v_result := json_build_object(
    'success', true,
    'rows_inserted', v_rows_inserted,
    'message', format('Metas geradas com sucesso: %s linhas', v_rows_inserted)
  );

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.generate_metas_setor TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_metas_setor TO anon;
