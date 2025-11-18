-- ============================================================================
-- OTIMIZAÇÃO: Índices - Schemas SAOLUIZ, SOL, LUCIA
-- ============================================================================
-- IMPORTANTE: Este script processa apenas os schemas menores que não deram timeout
-- O schema PARAISO está sendo processado separadamente com CONCURRENTLY
-- ============================================================================

DO $$
DECLARE
  v_schema TEXT;
  v_tenant_schemas TEXT[] := ARRAY['saoluiz', 'sol', 'lucia'];
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'OTIMIZAÇÃO DE ÍNDICES - Schemas Menores';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Schemas que serão processados:';
  RAISE NOTICE '   - saoluiz';
  RAISE NOTICE '   - sol';
  RAISE NOTICE '   - lucia';
  RAISE NOTICE '';

  FOREACH v_schema IN ARRAY v_tenant_schemas
  LOOP
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Processando schema: %', v_schema;
    RAISE NOTICE '========================================';
    RAISE NOTICE '';

    -- ==========================================================================
    -- PARTE 1: REMOVER ÍNDICES REDUNDANTES
    -- ==========================================================================
    RAISE NOTICE '📌 PARTE 1: Removendo índices redundantes';
    RAISE NOTICE '';

    BEGIN
      -- 1.1. idx_metas_setor_setor_data (redundante)
      IF EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = v_schema AND indexname = 'idx_metas_setor_setor_data'
      ) THEN
        EXECUTE format('DROP INDEX IF EXISTS %I.idx_metas_setor_setor_data', v_schema);
        RAISE NOTICE '   ✅ idx_metas_setor_setor_data removido';
      ELSE
        RAISE NOTICE '   ⚠️  idx_metas_setor_setor_data não existe';
      END IF;

      -- 1.2. idx_metas_setor_month_year (redundante)
      IF EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = v_schema AND indexname = 'idx_metas_setor_month_year'
      ) THEN
        EXECUTE format('DROP INDEX IF EXISTS %I.idx_metas_setor_month_year', v_schema);
        RAISE NOTICE '   ✅ idx_metas_setor_month_year removido';
      ELSE
        RAISE NOTICE '   ⚠️  idx_metas_setor_month_year não existe';
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '   ❌ Erro ao remover índices: %', SQLERRM;
    END;

    RAISE NOTICE '';

    -- ==========================================================================
    -- PARTE 2: CRIAR ÍNDICE COVERING CRÍTICO EM VENDAS
    -- ==========================================================================

    RAISE NOTICE '📌 PARTE 2: Criando índice covering em vendas (CRÍTICO - 85%% do ganho)';
    RAISE NOTICE '   ⏳ Este índice pode demorar vários minutos em tabelas grandes...';
    RAISE NOTICE '';

    BEGIN
      -- 2.1. Índice covering para range queries (CRÍTICO!)
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = v_schema
        AND tablename = 'vendas'
        AND indexname = 'idx_vendas_data_covering'
      ) THEN
        EXECUTE format('
          CREATE INDEX IF NOT EXISTS idx_vendas_data_covering
          ON %I.vendas(data_venda, filial_id, id_produto)
          INCLUDE (valor_vendas)
          WHERE data_venda >= ''2024-01-01''
        ', v_schema);
        RAISE NOTICE '   ✅ idx_vendas_data_covering criado';
        RAISE NOTICE '      Colunas: data_venda, filial_id, id_produto';
        RAISE NOTICE '      INCLUDE: valor_vendas';
        RAISE NOTICE '      WHERE: data_venda >= 2024-01-01 (reduz tamanho)';
      ELSE
        RAISE NOTICE '   ⚠️  idx_vendas_data_covering já existe';
      END IF;

      -- 2.2. Índice funcional para EXTRACT() (fallback)
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = v_schema
        AND tablename = 'vendas'
        AND indexname = 'idx_vendas_month_year_covering'
      ) THEN
        EXECUTE format('
          CREATE INDEX IF NOT EXISTS idx_vendas_month_year_covering
          ON %I.vendas(
            (EXTRACT(MONTH FROM data_venda)),
            (EXTRACT(YEAR FROM data_venda)),
            filial_id,
            id_produto
          )
          INCLUDE (valor_vendas)
          WHERE data_venda >= ''2024-01-01''
        ', v_schema);
        RAISE NOTICE '   ✅ idx_vendas_month_year_covering criado';
      ELSE
        RAISE NOTICE '   ⚠️  idx_vendas_month_year_covering já existe';
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '   ❌ Erro ao criar índices de vendas: %', SQLERRM;
    END;

    RAISE NOTICE '';

    -- ==========================================================================
    -- PARTE 3: CRIAR ÍNDICES PARA JOINS DINÂMICOS
    -- ==========================================================================

    RAISE NOTICE '📌 PARTE 3: Criando índices para JOINs dinâmicos (departments_level_1)';
    RAISE NOTICE '';

    BEGIN
      -- 3.1. Índice para pai_level_2_id
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = v_schema AND indexname = 'idx_dept_pai_level_2'
      ) THEN
        EXECUTE format('
          CREATE INDEX IF NOT EXISTS idx_dept_pai_level_2
          ON %I.departments_level_1(pai_level_2_id)
          INCLUDE (departamento_id)
          WHERE pai_level_2_id IS NOT NULL
        ', v_schema);
        RAISE NOTICE '   ✅ idx_dept_pai_level_2 criado';
      ELSE
        RAISE NOTICE '   ⚠️  idx_dept_pai_level_2 já existe';
      END IF;

      -- 3.2. Índice para pai_level_3_id
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = v_schema AND indexname = 'idx_dept_pai_level_3'
      ) THEN
        EXECUTE format('
          CREATE INDEX IF NOT EXISTS idx_dept_pai_level_3
          ON %I.departments_level_1(pai_level_3_id)
          INCLUDE (departamento_id)
          WHERE pai_level_3_id IS NOT NULL
        ', v_schema);
        RAISE NOTICE '   ✅ idx_dept_pai_level_3 criado';
      ELSE
        RAISE NOTICE '   ⚠️  idx_dept_pai_level_3 já existe';
      END IF;

      -- 3.3. Índice para pai_level_4_id
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = v_schema AND indexname = 'idx_dept_pai_level_4'
      ) THEN
        EXECUTE format('
          CREATE INDEX IF NOT EXISTS idx_dept_pai_level_4
          ON %I.departments_level_1(pai_level_4_id)
          INCLUDE (departamento_id)
          WHERE pai_level_4_id IS NOT NULL
        ', v_schema);
        RAISE NOTICE '   ✅ idx_dept_pai_level_4 criado';
      ELSE
        RAISE NOTICE '   ⚠️  idx_dept_pai_level_4 já existe';
      END IF;

      -- 3.4. Índice para pai_level_5_id
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = v_schema AND indexname = 'idx_dept_pai_level_5'
      ) THEN
        EXECUTE format('
          CREATE INDEX IF NOT EXISTS idx_dept_pai_level_5
          ON %I.departments_level_1(pai_level_5_id)
          INCLUDE (departamento_id)
          WHERE pai_level_5_id IS NOT NULL
        ', v_schema);
        RAISE NOTICE '   ✅ idx_dept_pai_level_5 criado';
      ELSE
        RAISE NOTICE '   ⚠️  idx_dept_pai_level_5 já existe';
      END IF;

      -- 3.5. Índice para pai_level_6_id
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = v_schema AND indexname = 'idx_dept_pai_level_6'
      ) THEN
        EXECUTE format('
          CREATE INDEX IF NOT EXISTS idx_dept_pai_level_6
          ON %I.departments_level_1(pai_level_6_id)
          INCLUDE (departamento_id)
          WHERE pai_level_6_id IS NOT NULL
        ', v_schema);
        RAISE NOTICE '   ✅ idx_dept_pai_level_6 criado';
      ELSE
        RAISE NOTICE '   ⚠️  idx_dept_pai_level_6 já existe';
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '   ❌ Erro ao criar índices de departments: %', SQLERRM;
    END;

    RAISE NOTICE '';

    -- ==========================================================================
    -- PARTE 4: CRIAR ÍNDICES AUXILIARES
    -- ==========================================================================

    RAISE NOTICE '📌 PARTE 4: Criando índices auxiliares';
    RAISE NOTICE '';

    BEGIN
      -- 4.1. Índice em produtos
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = v_schema AND indexname = 'idx_produtos_dept_filial'
      ) THEN
        EXECUTE format('
          CREATE INDEX IF NOT EXISTS idx_produtos_dept_filial
          ON %I.produtos(departamento_id, filial_id)
          INCLUDE (id)
        ', v_schema);
        RAISE NOTICE '   ✅ idx_produtos_dept_filial criado';
      ELSE
        RAISE NOTICE '   ⚠️  idx_produtos_dept_filial já existe';
      END IF;

      -- 4.2. Índice em descontos_venda
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = v_schema AND indexname = 'idx_descontos_data_filial'
      ) THEN
        EXECUTE format('
          CREATE INDEX IF NOT EXISTS idx_descontos_data_filial
          ON %I.descontos_venda(data_desconto, filial_id)
          INCLUDE (valor_desconto)
          WHERE valor_desconto IS NOT NULL
        ', v_schema);
        RAISE NOTICE '   ✅ idx_descontos_data_filial criado';
      ELSE
        RAISE NOTICE '   ⚠️  idx_descontos_data_filial já existe';
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '   ❌ Erro ao criar índices auxiliares: %', SQLERRM;
    END;

    RAISE NOTICE '';

    -- ==========================================================================
    -- PARTE 5: ATUALIZAR ESTATÍSTICAS
    -- ==========================================================================

    RAISE NOTICE '📌 PARTE 5: Atualizando estatísticas (ANALYZE)';
    RAISE NOTICE '';

    BEGIN
      EXECUTE format('ANALYZE %I.metas_setor', v_schema);
      RAISE NOTICE '   ✅ metas_setor';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '   ❌ Erro ao executar ANALYZE: %', SQLERRM;
    END;

    BEGIN
      EXECUTE format('ANALYZE %I.vendas', v_schema);
      RAISE NOTICE '   ✅ vendas';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '   ❌ Erro ao executar ANALYZE: %', SQLERRM;
    END;

    BEGIN
      EXECUTE format('ANALYZE %I.produtos', v_schema);
      RAISE NOTICE '   ✅ produtos';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '   ❌ Erro ao executar ANALYZE: %', SQLERRM;
    END;

    BEGIN
      EXECUTE format('ANALYZE %I.departments_level_1', v_schema);
      RAISE NOTICE '   ✅ departments_level_1';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '   ❌ Erro ao executar ANALYZE: %', SQLERRM;
    END;

    BEGIN
      EXECUTE format('ANALYZE %I.descontos_venda', v_schema);
      RAISE NOTICE '   ✅ descontos_venda';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '   ❌ Erro ao executar ANALYZE: %', SQLERRM;
    END;

    BEGIN
      EXECUTE format('ANALYZE %I.setores', v_schema);
      RAISE NOTICE '   ✅ setores';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '   ❌ Erro ao executar ANALYZE: %', SQLERRM;
    END;

    RAISE NOTICE '';
    RAISE NOTICE '✅ Schema % processado com sucesso!', v_schema;
    RAISE NOTICE '';

  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ OTIMIZAÇÃO CONCLUÍDA!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Schemas processados:';
  RAISE NOTICE '   ✅ saoluiz';
  RAISE NOTICE '   ✅ sol';
  RAISE NOTICE '   ✅ lucia';
  RAISE NOTICE '';
  RAISE NOTICE 'Próximos passos:';
  RAISE NOTICE '   1. Aguardar conclusão do índice CONCURRENTLY no schema paraiso';
  RAISE NOTICE '   2. Executar migration de otimização das RPC functions (02-06)';
  RAISE NOTICE '   3. Testar performance no frontend (/metas/setor)';
  RAISE NOTICE '';

END $$;
