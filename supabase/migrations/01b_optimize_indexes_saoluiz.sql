-- ============================================================================
-- OTIMIZAÇÃO: Índices do Módulo Meta por Setor - SCHEMA SAOLUIZ
-- ============================================================================

DO $$
DECLARE
  saoluiz TEXT := 'saoluiz';
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'OTIMIZANDO ÍNDICES - Schema: %', saoluiz;
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = saoluiz) THEN
    RAISE EXCEPTION 'Schema % não existe!', saoluiz;
  END IF;

  -- Remover índices redundantes
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = saoluiz AND tablename = 'metas_setor' AND indexname = 'idx_metas_setor_setor_data') THEN
      EXECUTE format('DROP INDEX %I.idx_metas_setor_setor_data', saoluiz);
      RAISE NOTICE '  ✅ idx_metas_setor_setor_data removido';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = saoluiz AND tablename = 'metas_setor' AND indexname = 'idx_metas_setor_month_year') THEN
      EXECUTE format('DROP INDEX %I.idx_metas_setor_month_year', saoluiz);
      RAISE NOTICE '  ✅ idx_metas_setor_month_year removido';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '  ❌ Erro: %', SQLERRM;
  END;

  -- Criar índices covering em vendas
  BEGIN
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_vendas_data_covering ON %I.vendas(data_venda, filial_id, id_produto) INCLUDE (valor_vendas) WHERE data_venda >= ''2024-01-01''', saoluiz);
    RAISE NOTICE '  ✅ idx_vendas_data_covering criado';
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_vendas_month_year_covering ON %I.vendas((EXTRACT(MONTH FROM data_venda)), (EXTRACT(YEAR FROM data_venda)), filial_id, id_produto) INCLUDE (valor_vendas) WHERE data_venda >= ''2024-01-01''', saoluiz);
    RAISE NOTICE '  ✅ idx_vendas_month_year_covering criado';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '  ❌ Erro: %', SQLERRM;
  END;

  -- Criar índices para JOINs
  BEGIN
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_dept_pai_level_2 ON %I.departments_level_1(pai_level_2_id) INCLUDE (departamento_id) WHERE pai_level_2_id IS NOT NULL', saoluiz);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_dept_pai_level_3 ON %I.departments_level_1(pai_level_3_id) INCLUDE (departamento_id) WHERE pai_level_3_id IS NOT NULL', saoluiz);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_dept_pai_level_4 ON %I.departments_level_1(pai_level_4_id) INCLUDE (departamento_id) WHERE pai_level_4_id IS NOT NULL', saoluiz);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_dept_pai_level_5 ON %I.departments_level_1(pai_level_5_id) INCLUDE (departamento_id) WHERE pai_level_5_id IS NOT NULL', saoluiz);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_dept_pai_level_6 ON %I.departments_level_1(pai_level_6_id) INCLUDE (departamento_id) WHERE pai_level_6_id IS NOT NULL', saoluiz);
    RAISE NOTICE '  ✅ Índices de JOINs criados';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '  ❌ Erro: %', SQLERRM;
  END;

  -- Criar índices auxiliares
  BEGIN
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_produtos_dept_filial ON %I.produtos(departamento_id, filial_id) INCLUDE (id)', saoluiz);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_descontos_data_filial ON %I.descontos_venda(data_desconto, filial_id) INCLUDE (valor_desconto) WHERE valor_desconto IS NOT NULL', saoluiz);
    RAISE NOTICE '  ✅ Índices auxiliares criados';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '  ❌ Erro: %', SQLERRM;
  END;

  -- ANALYZE
  BEGIN
    EXECUTE format('ANALYZE %I.metas_setor', saoluiz);
    EXECUTE format('ANALYZE %I.vendas', saoluiz);
    EXECUTE format('ANALYZE %I.produtos', saoluiz);
    EXECUTE format('ANALYZE %I.departments_level_1', saoluiz);
    EXECUTE format('ANALYZE %I.descontos_venda', saoluiz);
    EXECUTE format('ANALYZE %I.setores', saoluiz);
    EXECUTE format('ANALYZE %I.filiais', saoluiz);
    RAISE NOTICE '  ✅ ANALYZE concluído';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '  ❌ Erro: %', SQLERRM;
  END;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Schema % concluído!', saoluiz;
  RAISE NOTICE '📝 PRÓXIMO: Execute 01c_optimize_indexes_paraiso.sql';
  RAISE NOTICE '';

END $$;
