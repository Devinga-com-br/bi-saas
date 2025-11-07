-- ============================================================================
-- FUNÇÃO: get_metas_setor_report_optimized
-- Descrição: Carrega dados de metas por setor com valores realizados
-- Performance: Otimizada para múltiplas filiais em uma única chamada
-- ============================================================================

-- CRIAR ÍNDICES (executar uma vez por schema)
CREATE INDEX IF NOT EXISTS idx_metas_setor_report_query
ON metas_setor(setor_id, data, filial_id)
WHERE setor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_metas_setor_month_year
ON metas_setor((EXTRACT(MONTH FROM data)), (EXTRACT(YEAR FROM data)), setor_id);

-- Atualizar estatísticas para otimizar query planner
ANALYZE metas_setor;

-- ============================================================================
-- FUNÇÃO PRINCIPAL
-- ============================================================================
CREATE OR REPLACE FUNCTION get_metas_setor_report_optimized(
  p_schema TEXT,
  p_setor_id BIGINT,
  p_mes INT,
  p_ano INT,
  p_filial_ids BIGINT[] DEFAULT NULL
)
RETURNS TABLE(
  data DATE,
  dia_semana TEXT,
  filiais JSONB
)
LANGUAGE plpgsql
SET statement_timeout = '30s'
AS $$
DECLARE
  v_query TEXT;
  v_date_start DATE;
  v_date_end DATE;
  v_setor RECORD;
BEGIN
  -- Validar schema
  IF p_schema IS NULL OR p_schema = '' THEN
    RAISE EXCEPTION 'Schema inválido';
  END IF;

  -- Calcular range de datas do mês
  v_date_start := make_date(p_ano, p_mes, 1);
  v_date_end := (v_date_start + INTERVAL '1 month - 1 day')::DATE;

  -- Buscar informações do setor (departamento_ids)
  EXECUTE format(
    'SELECT id, nome, departamento_ids FROM %I.setores WHERE id = $1',
    p_schema
  ) INTO v_setor USING p_setor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Setor % não encontrado no schema %', p_setor_id, p_schema;
  END IF;

  -- Montar query dinâmica
  v_query := format($query$
    WITH metas_base AS (
      -- Buscar metas do setor
      SELECT
        ms.data,
        ms.filial_id,
        ms.dia_semana,
        ms.data_referencia,
        ms.meta_percentual,
        ms.valor_referencia,
        ms.valor_meta,
        ms.id
      FROM %I.metas_setor ms
      WHERE ms.setor_id = $1
        AND ms.data >= $2
        AND ms.data <= $3
        %s  -- Filtro de filiais (se fornecido)
    ),
    vendas_realizadas AS (
      -- Calcular vendas realizadas por data e filial
      -- Agrupando vendas dos departamentos do setor
      SELECT
        v.data,
        v.filial_id,
        COALESCE(SUM(v.valor_venda), 0) as valor_realizado
      FROM %I.vendas v  -- ou vendas_diarias_por_filial, dependendo da estrutura
      WHERE v.data >= $2
        AND v.data <= $3
        AND v.departamento_id = ANY($4)  -- Filtra pelos departamentos do setor
        %s  -- Filtro de filiais (se fornecido)
      GROUP BY v.data, v.filial_id
    ),
    metas_com_realizados AS (
      -- JOIN das metas com vendas realizadas
      SELECT
        mb.data,
        mb.filial_id,
        mb.dia_semana,
        mb.data_referencia,
        -- Dia da semana da referência
        TO_CHAR(mb.data_referencia, 'TMDay') as dia_semana_ref,
        mb.valor_referencia,
        mb.meta_percentual,
        mb.valor_meta,
        COALESCE(vr.valor_realizado, 0) as valor_realizado,
        -- Calcular diferenças
        (COALESCE(vr.valor_realizado, 0) - mb.valor_meta) as diferenca,
        CASE
          WHEN mb.valor_meta > 0 THEN
            ((COALESCE(vr.valor_realizado, 0) - mb.valor_meta) / mb.valor_meta * 100)
          ELSE 0
        END as diferenca_percentual
      FROM metas_base mb
      LEFT JOIN vendas_realizadas vr
        ON vr.data = mb.data
        AND vr.filial_id = mb.filial_id
    )
    -- Agrupar por data, retornando array de filiais
    SELECT
      mcr.data,
      mcr.dia_semana,
      jsonb_agg(
        jsonb_build_object(
          'filial_id', mcr.filial_id,
          'data_referencia', mcr.data_referencia,
          'dia_semana_ref', mcr.dia_semana_ref,
          'valor_referencia', mcr.valor_referencia,
          'meta_percentual', mcr.meta_percentual,
          'valor_meta', mcr.valor_meta,
          'valor_realizado', mcr.valor_realizado,
          'diferenca', mcr.diferenca,
          'diferenca_percentual', mcr.diferenca_percentual
        )
        ORDER BY mcr.filial_id
      ) as filiais
    FROM metas_com_realizados mcr
    GROUP BY mcr.data, mcr.dia_semana
    ORDER BY mcr.data
  $query$,
    p_schema,  -- Schema para metas_setor
    p_schema,  -- Schema para vendas
    CASE
      WHEN p_filial_ids IS NOT NULL THEN 'AND ms.filial_id = ANY($5)'
      ELSE ''
    END,
    CASE
      WHEN p_filial_ids IS NOT NULL THEN 'AND v.filial_id = ANY($5)'
      ELSE ''
    END
  );

  -- Executar query
  IF p_filial_ids IS NOT NULL THEN
    RETURN QUERY EXECUTE v_query
      USING p_setor_id, v_date_start, v_date_end, v_setor.departamento_ids, p_filial_ids;
  ELSE
    RETURN QUERY EXECUTE v_query
      USING p_setor_id, v_date_start, v_date_end, v_setor.departamento_ids;
  END IF;

EXCEPTION
  WHEN statement_timeout THEN
    RAISE NOTICE 'Query timeout - considere adicionar mais índices ou reduzir período';
    RETURN;
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao buscar metas: % - %', SQLERRM, SQLSTATE;
    RETURN;
END;
$$;

-- ============================================================================
-- COMO TESTAR
-- ============================================================================
-- Substituir 'seu_schema' pelo schema real do tenant
-- SELECT * FROM get_metas_setor_report_optimized(
--   'saoluiz',           -- schema
--   1,                   -- setor_id
--   11,                  -- mês (novembro)
--   2024,                -- ano
--   ARRAY[10, 20, 30]::BIGINT[]  -- filial_ids (opcional)
-- );

-- ============================================================================
-- QUERY PARA VERIFICAR ÍNDICES CRIADOS
-- ============================================================================
-- SELECT
--   schemaname,
--   tablename,
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE tablename = 'metas_setor'
--   AND schemaname = 'seu_schema'
-- ORDER BY indexname;
