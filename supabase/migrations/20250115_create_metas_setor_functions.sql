-- Migration: Create metas setor RPC functions
-- Description: Functions to generate and manage sector goals

-- Function to generate sector goals
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
  -- Get setor info
  EXECUTE format('
    SELECT nivel_departamento, departamento_ids 
    FROM %I.setores 
    WHERE id = $1
  ', p_schema) 
  INTO v_setor
  USING p_setor_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Setor não encontrado');
  END IF;

  v_nivel := v_setor.nivel_departamento;
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
    
    -- Get day of week in Portuguese
    v_dia_semana := CASE EXTRACT(DOW FROM v_current_date)
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

    -- Insert meta
    EXECUTE format('
      INSERT INTO %I.metas_setor (
        setor_id, filial_id, data, dia_semana, meta_percentual,
        data_referencia, valor_referencia, valor_meta,
        valor_realizado, diferenca, diferenca_percentual
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ', p_schema)
    USING p_setor_id, p_filial_id, v_current_date, v_dia_semana, p_meta_percentual,
          v_data_referencia, v_valor_referencia, v_valor_meta,
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
$$ LANGUAGE plpgsql;

-- Function to get metas setor report
CREATE OR REPLACE FUNCTION public.get_metas_setor_report(
  p_schema TEXT,
  p_mes INT,
  p_ano INT,
  p_filial_id BIGINT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  IF p_filial_id IS NULL THEN
    -- Return aggregated data for all filiais
    EXECUTE format('
      SELECT json_build_object(
        ''setores'', json_agg(setor_data ORDER BY setor_nome)
      )
      FROM (
        SELECT 
          s.id as setor_id,
          s.nome as setor_nome,
          json_agg(
            json_build_object(
              ''data'', ms.data,
              ''dia_semana'', ms.dia_semana,
              ''filiais'', (
                SELECT json_agg(
                  json_build_object(
                    ''filial_id'', ms2.filial_id,
                    ''data_referencia'', ms2.data_referencia,
                    ''meta_percentual'', ms2.meta_percentual,
                    ''valor_referencia'', COALESCE(ms2.valor_referencia, 0),
                    ''valor_meta'', COALESCE(ms2.valor_meta, 0),
                    ''valor_realizado'', COALESCE(ms2.valor_realizado, 0),
                    ''diferenca'', COALESCE(ms2.diferenca, 0),
                    ''diferenca_percentual'', COALESCE(ms2.diferenca_percentual, 0)
                  )
                  ORDER BY ms2.filial_id
                )
                FROM %I.metas_setor ms2
                WHERE ms2.setor_id = s.id
                AND ms2.data = ms.data
              )
            )
            ORDER BY ms.data
          ) as metas
        FROM %I.setores s
        LEFT JOIN %I.metas_setor ms ON ms.setor_id = s.id
        WHERE EXTRACT(MONTH FROM ms.data) = $1
        AND EXTRACT(YEAR FROM ms.data) = $2
        GROUP BY s.id, s.nome
      ) setor_data
    ', p_schema, p_schema, p_schema)
    INTO v_result
    USING p_mes, p_ano;
  ELSE
    -- Return data for specific filial
    EXECUTE format('
      SELECT json_build_object(
        ''setores'', json_agg(setor_data ORDER BY setor_nome)
      )
      FROM (
        SELECT 
          s.id as setor_id,
          s.nome as setor_nome,
          json_agg(
            json_build_object(
              ''data'', ms.data,
              ''dia_semana'', ms.dia_semana,
              ''data_referencia'', ms.data_referencia,
              ''meta_percentual'', ms.meta_percentual,
              ''valor_referencia'', COALESCE(ms.valor_referencia, 0),
              ''valor_meta'', COALESCE(ms.valor_meta, 0),
              ''valor_realizado'', COALESCE(ms.valor_realizado, 0),
              ''diferenca'', COALESCE(ms.diferenca, 0),
              ''diferenca_percentual'', COALESCE(ms.diferenca_percentual, 0)
            )
            ORDER BY ms.data
          ) as metas
        FROM %I.setores s
        LEFT JOIN %I.metas_setor ms ON ms.setor_id = s.id
        WHERE ms.filial_id = $1
        AND EXTRACT(MONTH FROM ms.data) = $2
        AND EXTRACT(YEAR FROM ms.data) = $3
        GROUP BY s.id, s.nome
      ) setor_data
    ', p_schema, p_schema)
    INTO v_result
    USING p_filial_id, p_mes, p_ano;
  END IF;

  RETURN COALESCE(v_result, '{}'::JSON);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql;
