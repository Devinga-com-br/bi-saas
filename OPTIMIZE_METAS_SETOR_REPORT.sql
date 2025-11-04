-- OTIMIZAÇÃO DA FUNÇÃO get_metas_setor_report E ÍNDICES
-- Este script otimiza a performance do relatório de metas por setor

-- 1. Adicionar índices compostos para melhorar performance
DO $$
DECLARE
  tenant_record RECORD;
  v_table_exists BOOLEAN;
BEGIN
  FOR tenant_record IN
    SELECT supabase_schema
    FROM public.tenants
    WHERE supabase_schema IS NOT NULL
  LOOP
    RAISE NOTICE 'Verificando schema: %', tenant_record.supabase_schema;

    -- Verificar se a tabela metas_setor existe
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = tenant_record.supabase_schema
      AND table_name = 'metas_setor'
    ) INTO v_table_exists;

    IF NOT v_table_exists THEN
      RAISE NOTICE '  - Tabela metas_setor não existe neste schema, pulando...';
      CONTINUE;
    END IF;

    RAISE NOTICE '  - Otimizando schema: %', tenant_record.supabase_schema;

    -- Criar índice composto otimizado para a query de metas
    EXECUTE format('
      CREATE INDEX IF NOT EXISTS idx_metas_setor_report_query
      ON %I.metas_setor(setor_id, data, filial_id)
      WHERE setor_id IS NOT NULL
    ', tenant_record.supabase_schema);

    -- Criar índice para EXTRACT de mês e ano (função)
    EXECUTE format('
      CREATE INDEX IF NOT EXISTS idx_metas_setor_month_year
      ON %I.metas_setor((EXTRACT(MONTH FROM data)), (EXTRACT(YEAR FROM data)), setor_id)
    ', tenant_record.supabase_schema);

    RAISE NOTICE '  - Índices criados com sucesso';
  END LOOP;

  RAISE NOTICE 'Otimização de índices completa!';
END $$;

-- 2. Criar função otimizada que evita timeouts
CREATE OR REPLACE FUNCTION public.get_metas_setor_report_optimized(
  p_schema TEXT,
  p_setor_id BIGINT,
  p_mes INT,
  p_ano INT,
  p_filial_ids BIGINT[] DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '30s'  -- Timeout de 30 segundos
AS $$
DECLARE
  v_result JSON;
  v_query TEXT;
  v_date_start DATE;
  v_date_end DATE;
BEGIN
  -- Calcular range de datas para otimizar query
  v_date_start := make_date(p_ano, p_mes, 1);
  v_date_end := (v_date_start + interval '1 month' - interval '1 day')::date;

  -- Build query dinamicamente
  v_query := format('
    SELECT COALESCE(json_agg(day_data ORDER BY data), ''[]''::json)
    FROM (
      SELECT
        data,
        MAX(dia_semana) as dia_semana,
        json_agg(
          json_build_object(
            ''filial_id'', filial_id,
            ''data_referencia'', data_referencia,
            ''dia_semana_ref'', COALESCE(dia_semana_ref,
              CASE EXTRACT(DOW FROM data_referencia)
                WHEN 0 THEN ''Domingo''
                WHEN 1 THEN ''Segunda-Feira''
                WHEN 2 THEN ''Terça-Feira''
                WHEN 3 THEN ''Quarta-Feira''
                WHEN 4 THEN ''Quinta-Feira''
                WHEN 5 THEN ''Sexta-Feira''
                WHEN 6 THEN ''Sábado''
              END
            ),
            ''valor_referencia'', COALESCE(valor_referencia, 0),
            ''meta_percentual'', COALESCE(meta_percentual, 0),
            ''valor_meta'', COALESCE(valor_meta, 0),
            ''valor_realizado'', COALESCE(valor_realizado, 0),
            ''diferenca'', COALESCE(diferenca, 0),
            ''diferenca_percentual'', COALESCE(diferenca_percentual, 0)
          ) ORDER BY filial_id
        ) as filiais
      FROM %I.metas_setor
      WHERE setor_id = $1
        AND data >= $2
        AND data <= $3
        %s
      GROUP BY data
    ) day_data
  ',
  p_schema,
  CASE
    WHEN p_filial_ids IS NOT NULL AND array_length(p_filial_ids, 1) > 0
    THEN 'AND filial_id = ANY($4)'
    ELSE ''
  END
  );

  -- Execute query
  IF p_filial_ids IS NOT NULL AND array_length(p_filial_ids, 1) > 0 THEN
    EXECUTE v_query INTO v_result USING p_setor_id, v_date_start, v_date_end, p_filial_ids;
  ELSE
    EXECUTE v_query INTO v_result USING p_setor_id, v_date_start, v_date_end;
  END IF;

  RETURN COALESCE(v_result, '[]'::json);
EXCEPTION
  WHEN query_canceled THEN
    RAISE NOTICE 'Query timeout for setor_id=%, mes=%, ano=%', p_setor_id, p_mes, p_ano;
    RETURN '[]'::json;
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in get_metas_setor_report_optimized: %', SQLERRM;
    RETURN '[]'::json;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_metas_setor_report_optimized TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_metas_setor_report_optimized TO anon;

-- 3. Análise de tabelas para atualizar estatísticas do query planner
DO $$
DECLARE
  tenant_record RECORD;
  v_table_exists BOOLEAN;
BEGIN
  FOR tenant_record IN
    SELECT supabase_schema
    FROM public.tenants
    WHERE supabase_schema IS NOT NULL
  LOOP
    -- Verificar se a tabela metas_setor existe
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = tenant_record.supabase_schema
      AND table_name = 'metas_setor'
    ) INTO v_table_exists;

    IF NOT v_table_exists THEN
      RAISE NOTICE 'Schema %: tabela metas_setor não existe, pulando...', tenant_record.supabase_schema;
      CONTINUE;
    END IF;

    RAISE NOTICE 'Analisando tabela metas_setor em: %', tenant_record.supabase_schema;

    EXECUTE format('ANALYZE %I.metas_setor', tenant_record.supabase_schema);

    RAISE NOTICE '  - Análise completa';
  END LOOP;

  RAISE NOTICE 'Análise de tabelas completa!';
END $$;
