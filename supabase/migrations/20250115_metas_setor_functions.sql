-- Migration: Criar funções para Metas por Setor
-- Description: Funções para gerar e consultar metas por setor

-- Função para gerar metas por setor
CREATE OR REPLACE FUNCTION public.generate_metas_setor(
  p_schema TEXT,
  p_setor_id BIGINT,
  p_mes INT,
  p_ano INT,
  p_filial_id BIGINT DEFAULT NULL,
  p_data_referencia_inicial DATE,
  p_meta_percentual NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_setor RECORD;
  v_filial RECORD;
  v_start_date DATE;
  v_end_date DATE;
  v_ref_start_date DATE;
  v_current_date DATE;
  v_ref_date DATE;
  v_day_offset INT;
  v_result JSON;
  v_total_inserted INT := 0;
  v_dept_ids BIGINT[];
  v_nivel INT;
BEGIN
  -- Validar parâmetros
  IF p_mes < 1 OR p_mes > 12 THEN
    RAISE EXCEPTION 'Mês inválido: %', p_mes;
  END IF;

  -- Buscar informações do setor
  EXECUTE format('SELECT departamento_ids, nivel FROM %I.setores WHERE id = $1', p_schema)
  INTO v_setor
  USING p_setor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Setor não encontrado: %', p_setor_id;
  END IF;

  v_dept_ids := v_setor.departamento_ids;
  v_nivel := v_setor.nivel;

  -- Calcular datas do período
  v_start_date := make_date(p_ano, p_mes, 1);
  v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  
  -- Data de referência inicial
  v_ref_start_date := p_data_referencia_inicial;

  -- Se filial específica informada
  IF p_filial_id IS NOT NULL THEN
    -- Deletar metas existentes para regenerar
    EXECUTE format(
      'DELETE FROM %I.metas_setor WHERE setor_id = $1 AND filial_id = $2 AND data >= $3 AND data <= $4',
      p_schema
    ) USING p_setor_id, p_filial_id, v_start_date, v_end_date;

    -- Gerar metas para cada dia do mês
    v_current_date := v_start_date;
    v_day_offset := 0;

    WHILE v_current_date <= v_end_date LOOP
      v_ref_date := v_ref_start_date + (v_day_offset || ' days')::INTERVAL;

      -- Inserir meta para a filial e dia
      EXECUTE format('
        INSERT INTO %I.metas_setor (
          setor_id,
          filial_id,
          data,
          dia_semana,
          data_referencia,
          dia_semana_ref,
          meta_percentual,
          valor_referencia,
          valor_meta,
          valor_realizado,
          diferenca,
          diferenca_percentual
        )
        SELECT 
          $1::BIGINT,
          $2::BIGINT,
          $3::DATE,
          CASE EXTRACT(DOW FROM $3::DATE)
            WHEN 0 THEN ''Domingo''
            WHEN 1 THEN ''Segunda-Feira''
            WHEN 2 THEN ''Terça-Feira''
            WHEN 3 THEN ''Quarta-Feira''
            WHEN 4 THEN ''Quinta-Feira''
            WHEN 5 THEN ''Sexta-Feira''
            WHEN 6 THEN ''Sábado''
          END,
          $4::DATE,
          CASE EXTRACT(DOW FROM $4::DATE)
            WHEN 0 THEN ''Domingo''
            WHEN 1 THEN ''Segunda-Feira''
            WHEN 2 THEN ''Terça-Feira''
            WHEN 3 THEN ''Quarta-Feira''
            WHEN 4 THEN ''Quinta-Feira''
            WHEN 5 THEN ''Sexta-Feira''
            WHEN 6 THEN ''Sábado''
          END,
          $5::NUMERIC,
          COALESCE(ref.valor_vendas, 0),
          COALESCE(ref.valor_vendas, 0) * (1 + $5::NUMERIC / 100),
          COALESCE(real.valor_vendas, 0),
          COALESCE(real.valor_vendas, 0) - (COALESCE(ref.valor_vendas, 0) * (1 + $5::NUMERIC / 100)),
          CASE 
            WHEN COALESCE(ref.valor_vendas, 0) * (1 + $5::NUMERIC / 100) > 0 
            THEN ((COALESCE(real.valor_vendas, 0) - (COALESCE(ref.valor_vendas, 0) * (1 + $5::NUMERIC / 100))) / 
                  (COALESCE(ref.valor_vendas, 0) * (1 + $5::NUMERIC / 100)) * 100)
            ELSE 0
          END
        FROM (
          SELECT SUM(v.valor_vendas) as valor_vendas
          FROM %I.vendas v
          JOIN %I.produtos p ON v.id_produto = p.id AND v.filial_id = p.filial_id
          WHERE v.filial_id = $2
            AND v.data_venda = $4
            AND p.departamento_id = ANY($6::BIGINT[])
            AND p.departamento_nivel = $7
        ) ref
        CROSS JOIN (
          SELECT SUM(v.valor_vendas) as valor_vendas
          FROM %I.vendas v
          JOIN %I.produtos p ON v.id_produto = p.id AND v.filial_id = p.filial_id
          WHERE v.filial_id = $2
            AND v.data_venda = $3
            AND p.departamento_id = ANY($6::BIGINT[])
            AND p.departamento_nivel = $7
        ) real
        ON CONFLICT (setor_id, filial_id, data) 
        DO UPDATE SET
          dia_semana = EXCLUDED.dia_semana,
          data_referencia = EXCLUDED.data_referencia,
          dia_semana_ref = EXCLUDED.dia_semana_ref,
          meta_percentual = EXCLUDED.meta_percentual,
          valor_referencia = EXCLUDED.valor_referencia,
          valor_meta = EXCLUDED.valor_meta,
          valor_realizado = EXCLUDED.valor_realizado,
          diferenca = EXCLUDED.diferenca,
          diferenca_percentual = EXCLUDED.diferenca_percentual,
          updated_at = NOW()
      ', p_schema, p_schema, p_schema, p_schema, p_schema)
      USING p_setor_id, p_filial_id, v_current_date, v_ref_date, p_meta_percentual, v_dept_ids, v_nivel;

      v_total_inserted := v_total_inserted + 1;
      v_current_date := v_current_date + 1;
      v_day_offset := v_day_offset + 1;
    END LOOP;

  ELSE
    -- Gerar para todas as filiais
    FOR v_filial IN 
      EXECUTE format('SELECT DISTINCT id FROM public.branches WHERE tenant_id = (SELECT id FROM public.tenants WHERE supabase_schema = $1)')
      USING p_schema
    LOOP
      -- Deletar metas existentes para regenerar
      EXECUTE format(
        'DELETE FROM %I.metas_setor WHERE setor_id = $1 AND filial_id = $2 AND data >= $3 AND data <= $4',
        p_schema
      ) USING p_setor_id, v_filial.id, v_start_date, v_end_date;

      -- Gerar metas para cada dia do mês
      v_current_date := v_start_date;
      v_day_offset := 0;

      WHILE v_current_date <= v_end_date LOOP
        v_ref_date := v_ref_start_date + (v_day_offset || ' days')::INTERVAL;

        -- Inserir meta para a filial e dia
        EXECUTE format('
          INSERT INTO %I.metas_setor (
            setor_id,
            filial_id,
            data,
            dia_semana,
            data_referencia,
            dia_semana_ref,
            meta_percentual,
            valor_referencia,
            valor_meta,
            valor_realizado,
            diferenca,
            diferenca_percentual
          )
          SELECT 
            $1::BIGINT,
            $2::BIGINT,
            $3::DATE,
            CASE EXTRACT(DOW FROM $3::DATE)
              WHEN 0 THEN ''Domingo''
              WHEN 1 THEN ''Segunda-Feira''
              WHEN 2 THEN ''Terça-Feira''
              WHEN 3 THEN ''Quarta-Feira''
              WHEN 4 THEN ''Quinta-Feira''
              WHEN 5 THEN ''Sexta-Feira''
              WHEN 6 THEN ''Sábado''
            END,
            $4::DATE,
            CASE EXTRACT(DOW FROM $4::DATE)
              WHEN 0 THEN ''Domingo''
              WHEN 1 THEN ''Segunda-Feira''
              WHEN 2 THEN ''Terça-Feira''
              WHEN 3 THEN ''Quarta-Feira''
              WHEN 4 THEN ''Quinta-Feira''
              WHEN 5 THEN ''Sexta-Feira''
              WHEN 6 THEN ''Sábado''
            END,
            $5::NUMERIC,
            COALESCE(ref.valor_vendas, 0),
            COALESCE(ref.valor_vendas, 0) * (1 + $5::NUMERIC / 100),
            COALESCE(real.valor_vendas, 0),
            COALESCE(real.valor_vendas, 0) - (COALESCE(ref.valor_vendas, 0) * (1 + $5::NUMERIC / 100)),
            CASE 
              WHEN COALESCE(ref.valor_vendas, 0) * (1 + $5::NUMERIC / 100) > 0 
              THEN ((COALESCE(real.valor_vendas, 0) - (COALESCE(ref.valor_vendas, 0) * (1 + $5::NUMERIC / 100))) / 
                    (COALESCE(ref.valor_vendas, 0) * (1 + $5::NUMERIC / 100)) * 100)
              ELSE 0
            END
          FROM (
            SELECT SUM(v.valor_vendas) as valor_vendas
            FROM %I.vendas v
            JOIN %I.produtos p ON v.id_produto = p.id AND v.filial_id = p.filial_id
            WHERE v.filial_id = $2
              AND v.data_venda = $4
              AND p.departamento_id = ANY($6::BIGINT[])
              AND p.departamento_nivel = $7
          ) ref
          CROSS JOIN (
            SELECT SUM(v.valor_vendas) as valor_vendas
            FROM %I.vendas v
            JOIN %I.produtos p ON v.id_produto = p.id AND v.filial_id = p.filial_id
            WHERE v.filial_id = $2
              AND v.data_venda = $3
              AND p.departamento_id = ANY($6::BIGINT[])
              AND p.departamento_nivel = $7
          ) real
          ON CONFLICT (setor_id, filial_id, data) 
          DO UPDATE SET
            dia_semana = EXCLUDED.dia_semana,
            data_referencia = EXCLUDED.data_referencia,
            dia_semana_ref = EXCLUDED.dia_semana_ref,
            meta_percentual = EXCLUDED.meta_percentual,
            valor_referencia = EXCLUDED.valor_referencia,
            valor_meta = EXCLUDED.valor_meta,
            valor_realizado = EXCLUDED.valor_realizado,
            diferenca = EXCLUDED.diferenca,
            diferenca_percentual = EXCLUDED.diferenca_percentual,
            updated_at = NOW()
        ', p_schema, p_schema, p_schema, p_schema, p_schema)
        USING p_setor_id, v_filial.id, v_current_date, v_ref_date, p_meta_percentual, v_dept_ids, v_nivel;

        v_total_inserted := v_total_inserted + 1;
        v_current_date := v_current_date + 1;
        v_day_offset := v_day_offset + 1;
      END LOOP;
    END LOOP;
  END IF;

  v_result := json_build_object(
    'total_inserted', v_total_inserted,
    'mes', p_mes,
    'ano', p_ano
  );

  RETURN v_result;
END;
$$;

-- Função para obter relatório de metas por setor
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
BEGIN
  IF p_filial_id IS NOT NULL THEN
    -- Retornar metas de uma filial específica
    EXECUTE format('
      SELECT COALESCE(json_agg(day_data ORDER BY data), ''[]''::json)
      FROM (
        SELECT 
          data,
          dia_semana,
          json_agg(
            json_build_object(
              ''filial_id'', filial_id,
              ''data_referencia'', data_referencia,
              ''dia_semana_ref'', dia_semana_ref,
              ''valor_referencia'', valor_referencia,
              ''meta_percentual'', meta_percentual,
              ''valor_meta'', valor_meta,
              ''valor_realizado'', valor_realizado,
              ''diferenca'', diferenca,
              ''diferenca_percentual'', diferenca_percentual
            ) ORDER BY filial_id
          ) as filiais
        FROM %I.metas_setor
        WHERE setor_id = $1
          AND filial_id = $2
          AND EXTRACT(MONTH FROM data) = $3
          AND EXTRACT(YEAR FROM data) = $4
        GROUP BY data, dia_semana
      ) day_data
    ', p_schema)
    INTO v_result
    USING p_setor_id, p_filial_id, p_mes, p_ano;
  ELSE
    -- Retornar metas de todas as filiais
    EXECUTE format('
      SELECT COALESCE(json_agg(day_data ORDER BY data), ''[]''::json)
      FROM (
        SELECT 
          data,
          MAX(dia_semana) as dia_semana,
          json_agg(
            json_build_object(
              ''filial_id'', filial_id,
              ''data_referencia'', data_referencia,
              ''dia_semana_ref'', dia_semana_ref,
              ''valor_referencia'', valor_referencia,
              ''meta_percentual'', meta_percentual,
              ''valor_meta'', valor_meta,
              ''valor_realizado'', valor_realizado,
              ''diferenca'', diferenca,
              ''diferenca_percentual'', diferenca_percentual
            ) ORDER BY filial_id
          ) as filiais
        FROM %I.metas_setor
        WHERE setor_id = $1
          AND EXTRACT(MONTH FROM data) = $2
          AND EXTRACT(YEAR FROM data) = $3
        GROUP BY data
      ) day_data
    ', p_schema)
    INTO v_result
    USING p_setor_id, p_mes, p_ano;
  END IF;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION public.generate_metas_setor TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_metas_setor_report TO authenticated;
