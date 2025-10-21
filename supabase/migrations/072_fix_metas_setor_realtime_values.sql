-- Migration: Fix metas_setor to show realtime valores_realizados
-- Description: Modify get_metas_setor_report to calculate valor_realizado in realtime
--              by joining with vendas table instead of using stored values

DROP FUNCTION IF EXISTS public.get_metas_setor_report(TEXT, BIGINT, INT, INT, BIGINT);

CREATE OR REPLACE FUNCTION public.get_metas_setor_report(
  p_schema TEXT,
  p_setor_id BIGINT,
  p_mes INT,
  p_ano INT,
  p_filial_id BIGINT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_departamento_ids_level3 BIGINT[];
  v_departamento_ids_level1 BIGINT[];
  v_dept_ids_text TEXT;
  v_debug_query TEXT;
  v_debug_count BIGINT;
BEGIN
  -- Get departamento_ids (level 3) for the setor
  EXECUTE format('
    SELECT departamento_ids
    FROM %I.setores
    WHERE id = $1
  ', p_schema)
  INTO v_departamento_ids_level3
  USING p_setor_id;

  RAISE NOTICE 'DEBUG: Setor ID: %, Departamento IDs Level 3: %', p_setor_id, v_departamento_ids_level3;

  IF v_departamento_ids_level3 IS NULL OR array_length(v_departamento_ids_level3, 1) IS NULL THEN
    -- Setor not found or has no departments
    RAISE NOTICE 'DEBUG: Setor not found or has no departments';
    RETURN '[]'::json;
  END IF;

  -- Get all level 1 departments that belong to these level 3 departments
  EXECUTE format('
    SELECT ARRAY_AGG(departamento_id)
    FROM %I.departments_level_1
    WHERE pai_level_3_id = ANY($1)
  ', p_schema)
  INTO v_departamento_ids_level1
  USING v_departamento_ids_level3;

  RAISE NOTICE 'DEBUG: Found % Level 1 departments', array_length(v_departamento_ids_level1, 1);

  IF v_departamento_ids_level1 IS NULL OR array_length(v_departamento_ids_level1, 1) IS NULL THEN
    -- No level 1 departments found for these level 3 departments
    RAISE NOTICE 'DEBUG: No level 1 departments found for level 3 IDs';
    RETURN '[]'::json;
  END IF;

  -- Convert array to text for use in query
  v_dept_ids_text := array_to_string(v_departamento_ids_level1, ',');
  RAISE NOTICE 'DEBUG: Dept IDs as text: %', v_dept_ids_text;

  -- Debug: Check if there are any vendas for this period
  v_debug_query := format('
    SELECT COUNT(*)
    FROM %I.vendas v
    WHERE EXTRACT(MONTH FROM v.data_venda) = $1
      AND EXTRACT(YEAR FROM v.data_venda) = $2
  ', p_schema);

  EXECUTE v_debug_query INTO v_debug_count USING p_mes, p_ano;
  RAISE NOTICE 'DEBUG: Total vendas in month % year %: %', p_mes, p_ano, v_debug_count;

  -- Debug: Check vendas with departamento filter (using level 1 IDs)
  v_debug_query := format('
    SELECT COUNT(*)
    FROM %I.vendas v
    INNER JOIN %I.produtos p ON v.id_produto = p.id AND v.filial_id = p.filial_id
    WHERE EXTRACT(MONTH FROM v.data_venda) = $1
      AND EXTRACT(YEAR FROM v.data_venda) = $2
      AND p.departamento_id = ANY(ARRAY[%s]::BIGINT[])
  ', p_schema, p_schema, v_dept_ids_text);

  EXECUTE v_debug_query INTO v_debug_count USING p_mes, p_ano;
  RAISE NOTICE 'DEBUG: Vendas with dept level 1 filter: %', v_debug_count;

  IF p_filial_id IS NOT NULL THEN
    -- Debug for specific filial
    v_debug_query := format('
      SELECT COUNT(*)
      FROM %I.vendas v
      INNER JOIN %I.produtos p ON v.id_produto = p.id AND v.filial_id = p.filial_id
      WHERE v.filial_id = $1
        AND EXTRACT(MONTH FROM v.data_venda) = $2
        AND EXTRACT(YEAR FROM v.data_venda) = $3
        AND p.departamento_id = ANY(ARRAY[%s]::BIGINT[])
    ', p_schema, p_schema, v_dept_ids_text);

    EXECUTE v_debug_query INTO v_debug_count USING p_filial_id, p_mes, p_ano;
    RAISE NOTICE 'DEBUG: Vendas for filial % with dept level 1 filter: %', p_filial_id, v_debug_count;

    -- Return metas for a specific filial with realtime valores_realizados
    EXECUTE format('
      WITH valores_realizados AS (
        SELECT
          v.data_venda,
          v.filial_id,
          SUM(v.valor_vendas) as valor_realizado,
          COUNT(*) as num_vendas
        FROM %I.vendas v
        INNER JOIN %I.produtos p ON v.id_produto = p.id AND v.filial_id = p.filial_id
        WHERE v.filial_id = $1
          AND EXTRACT(MONTH FROM v.data_venda) = $2
          AND EXTRACT(YEAR FROM v.data_venda) = $3
          AND p.departamento_id = ANY(ARRAY[%s]::BIGINT[])
        GROUP BY v.data_venda, v.filial_id
      )
      SELECT COALESCE(json_agg(day_data ORDER BY data), ''[]''::json)
      FROM (
        SELECT
          m.data,
          m.dia_semana,
          json_agg(
            json_build_object(
              ''filial_id'', m.filial_id,
              ''data_referencia'', m.data_referencia,
              ''dia_semana_ref'', COALESCE(m.dia_semana_ref,
                CASE EXTRACT(DOW FROM m.data_referencia)
                  WHEN 0 THEN ''Domingo''
                  WHEN 1 THEN ''Segunda-Feira''
                  WHEN 2 THEN ''Terça-Feira''
                  WHEN 3 THEN ''Quarta-Feira''
                  WHEN 4 THEN ''Quinta-Feira''
                  WHEN 5 THEN ''Sexta-Feira''
                  WHEN 6 THEN ''Sábado''
                END
              ),
              ''valor_referencia'', m.valor_referencia,
              ''meta_percentual'', m.meta_percentual,
              ''valor_meta'', m.valor_meta,
              ''valor_realizado'', COALESCE(vr.valor_realizado, 0),
              ''diferenca'', COALESCE(vr.valor_realizado, 0) - m.valor_meta,
              ''diferenca_percentual'', CASE
                WHEN m.valor_meta > 0 THEN
                  ((COALESCE(vr.valor_realizado, 0) - m.valor_meta) / m.valor_meta) * 100
                ELSE 0
              END,
              ''_debug_num_vendas'', COALESCE(vr.num_vendas, 0),
              ''_debug_data_meta'', m.data::text,
              ''_debug_data_venda'', COALESCE(vr.data_venda::text, ''null'')
            ) ORDER BY m.filial_id
          ) as filiais
        FROM %I.metas_setor m
        LEFT JOIN valores_realizados vr ON vr.data_venda = m.data AND vr.filial_id = m.filial_id
        WHERE m.setor_id = $4
          AND m.filial_id = $1
          AND EXTRACT(MONTH FROM m.data) = $2
          AND EXTRACT(YEAR FROM m.data) = $3
        GROUP BY m.data, m.dia_semana
      ) day_data
    ', p_schema, p_schema, v_dept_ids_text, p_schema)
    INTO v_result
    USING p_filial_id, p_mes, p_ano, p_setor_id;
  ELSE
    -- Return metas for all filiais with realtime valores_realizados
    EXECUTE format('
      WITH valores_realizados AS (
        SELECT
          v.data_venda,
          v.filial_id,
          SUM(v.valor_vendas) as valor_realizado,
          COUNT(*) as num_vendas
        FROM %I.vendas v
        INNER JOIN %I.produtos p ON v.id_produto = p.id AND v.filial_id = p.filial_id
        WHERE EXTRACT(MONTH FROM v.data_venda) = $1
          AND EXTRACT(YEAR FROM v.data_venda) = $2
          AND p.departamento_id = ANY(ARRAY[%s]::BIGINT[])
        GROUP BY v.data_venda, v.filial_id
      )
      SELECT COALESCE(json_agg(day_data ORDER BY data), ''[]''::json)
      FROM (
        SELECT
          m.data,
          MAX(m.dia_semana) as dia_semana,
          json_agg(
            json_build_object(
              ''filial_id'', m.filial_id,
              ''data_referencia'', m.data_referencia,
              ''dia_semana_ref'', COALESCE(m.dia_semana_ref,
                CASE EXTRACT(DOW FROM m.data_referencia)
                  WHEN 0 THEN ''Domingo''
                  WHEN 1 THEN ''Segunda-Feira''
                  WHEN 2 THEN ''Terça-Feira''
                  WHEN 3 THEN ''Quarta-Feira''
                  WHEN 4 THEN ''Quinta-Feira''
                  WHEN 5 THEN ''Sexta-Feira''
                  WHEN 6 THEN ''Sábado''
                END
              ),
              ''valor_referencia'', m.valor_referencia,
              ''meta_percentual'', m.meta_percentual,
              ''valor_meta'', m.valor_meta,
              ''valor_realizado'', COALESCE(vr.valor_realizado, 0),
              ''diferenca'', COALESCE(vr.valor_realizado, 0) - m.valor_meta,
              ''diferenca_percentual'', CASE
                WHEN m.valor_meta > 0 THEN
                  ((COALESCE(vr.valor_realizado, 0) - m.valor_meta) / m.valor_meta) * 100
                ELSE 0
              END,
              ''_debug_num_vendas'', COALESCE(vr.num_vendas, 0),
              ''_debug_data_meta'', m.data::text,
              ''_debug_data_venda'', COALESCE(vr.data_venda::text, ''null'')
            ) ORDER BY m.filial_id
          ) as filiais
        FROM %I.metas_setor m
        LEFT JOIN valores_realizados vr ON vr.data_venda = m.data AND vr.filial_id = m.filial_id
        WHERE m.setor_id = $3
          AND EXTRACT(MONTH FROM m.data) = $1
          AND EXTRACT(YEAR FROM m.data) = $2
        GROUP BY m.data
      ) day_data
    ', p_schema, p_schema, v_dept_ids_text, p_schema)
    INTO v_result
    USING p_mes, p_ano, p_setor_id;
  END IF;

  RAISE NOTICE 'DEBUG: Result length: %', length(v_result::text);

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_metas_setor_report TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_metas_setor_report TO anon;

-- Comment explaining the change
COMMENT ON FUNCTION public.get_metas_setor_report IS
'Retorna relatório de metas por setor com valores realizados calculados em tempo real.
A função busca os departamento_ids do setor e calcula o valor_realizado somando
as vendas da tabela vendas onde departamento_id está no array de departamento_ids do setor.
Os valores de diferenca e diferenca_percentual também são recalculados dinamicamente.
Usa CTE (Common Table Expression) para calcular valores realizados e fazer LEFT JOIN com metas.';
