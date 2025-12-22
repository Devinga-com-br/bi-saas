-- ============================================================================
-- FUNCTION: public.clone_schema_for_tenant
-- ============================================================================
-- Clona a estrutura completa do schema okilao para um novo schema
-- Usado pelo sistema quando um superadmin cria uma nova empresa
--
-- SECURITY DEFINER: Executa com privilégios do owner (postgres)
-- Apenas service_role pode executar esta função
--
-- Parâmetros:
--   p_target_schema TEXT - Nome do novo schema a ser criado
--
-- Retorna JSON com:
--   success: boolean
--   schema: nome do schema criado
--   tables_created: número de tabelas criadas
--   indexes_created: número de índices criados
--   error: mensagem de erro (se houver)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.clone_schema_for_tenant(
    p_target_schema TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_source_schema TEXT := 'okilao';  -- Sempre clona de okilao
    v_tables_created INT := 0;
    v_indexes_created INT := 0;
    v_pks_created INT := 0;
    v_unique_created INT := 0;
    v_fks_created INT := 0;
    v_mvs_created INT := 0;
    v_functions_created INT := 0;
    v_triggers_created INT := 0;
    r RECORD;
    v_pk_columns TEXT;
    v_unique_columns TEXT;
    v_new_constraint_name TEXT;
    v_new_indexname TEXT;
    v_new_indexdef TEXT;
    v_new_definition TEXT;
    v_func_def TEXT;
    v_trigger_sql TEXT;
BEGIN
    -- ========================================================================
    -- VERIFICAÇÕES DE SEGURANÇA
    -- ========================================================================

    -- 1. Verificar se schema destino já existe (PROTEÇÃO CRÍTICA)
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = p_target_schema) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Schema já existe: ' || p_target_schema || '. Não é possível sobrescrever schemas existentes.'
        );
    END IF;

    -- 2. Verificar se schema origem existe
    IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = v_source_schema) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Schema de origem não encontrado: ' || v_source_schema
        );
    END IF;

    -- 3. Validar nome do schema (apenas letras minúsculas, números e underscore)
    IF p_target_schema !~ '^[a-z][a-z0-9_]*$' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Nome do schema inválido. Use apenas letras minúsculas, números e underscore, começando com letra.'
        );
    END IF;

    -- ========================================================================
    -- CRIAR SCHEMA
    -- ========================================================================
    EXECUTE format('CREATE SCHEMA %I', p_target_schema);
    RAISE NOTICE 'Schema criado: %', p_target_schema;

    -- ========================================================================
    -- CRIAR TABELAS (estrutura vazia)
    -- ========================================================================
    FOR r IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = v_source_schema
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
    LOOP
        BEGIN
            EXECUTE format(
                'CREATE TABLE %I.%I AS SELECT * FROM %I.%I WHERE 1=0',
                p_target_schema, r.table_name, v_source_schema, r.table_name
            );
            v_tables_created := v_tables_created + 1;
            RAISE NOTICE 'Tabela criada: %', r.table_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao criar tabela %: %', r.table_name, SQLERRM;
        END;
    END LOOP;

    -- ========================================================================
    -- ADICIONAR PRIMARY KEYS
    -- ========================================================================
    FOR r IN
        SELECT DISTINCT tc.table_name, tc.constraint_name
        FROM information_schema.table_constraints tc
        WHERE tc.table_schema = v_source_schema
          AND tc.constraint_type = 'PRIMARY KEY'
        ORDER BY tc.table_name
    LOOP
        SELECT string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position)
        INTO v_pk_columns
        FROM information_schema.key_column_usage kcu
        WHERE kcu.constraint_name = r.constraint_name
          AND kcu.table_schema = v_source_schema;

        BEGIN
            EXECUTE format(
                'ALTER TABLE %I.%I ADD PRIMARY KEY (%s)',
                p_target_schema, r.table_name, v_pk_columns
            );
            v_pks_created := v_pks_created + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'PK erro em %: %', r.table_name, SQLERRM;
        END;
    END LOOP;

    -- ========================================================================
    -- ADICIONAR UNIQUE CONSTRAINTS
    -- ========================================================================
    FOR r IN
        SELECT DISTINCT tc.table_name, tc.constraint_name
        FROM information_schema.table_constraints tc
        WHERE tc.table_schema = v_source_schema
          AND tc.constraint_type = 'UNIQUE'
        ORDER BY tc.table_name
    LOOP
        SELECT string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position)
        INTO v_unique_columns
        FROM information_schema.key_column_usage kcu
        WHERE kcu.constraint_name = r.constraint_name
          AND kcu.table_schema = v_source_schema;

        v_new_constraint_name := REPLACE(r.constraint_name, v_source_schema, p_target_schema);

        BEGIN
            EXECUTE format(
                'ALTER TABLE %I.%I ADD CONSTRAINT %I UNIQUE (%s)',
                p_target_schema, r.table_name, v_new_constraint_name, v_unique_columns
            );
            v_unique_created := v_unique_created + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'UNIQUE erro em %: %', r.table_name, SQLERRM;
        END;
    END LOOP;

    -- ========================================================================
    -- CRIAR ÍNDICES
    -- ========================================================================
    FOR r IN
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = v_source_schema
          AND indexname NOT LIKE '%_pkey'
        ORDER BY tablename, indexname
    LOOP
        v_new_indexname := REPLACE(r.indexname, v_source_schema, p_target_schema);
        v_new_indexdef := REPLACE(r.indexdef, v_source_schema || '.', p_target_schema || '.');
        v_new_indexdef := REPLACE(v_new_indexdef, 'INDEX ' || r.indexname, 'INDEX ' || v_new_indexname);

        BEGIN
            EXECUTE v_new_indexdef;
            v_indexes_created := v_indexes_created + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Índice erro em %: %', v_new_indexname, SQLERRM;
        END;
    END LOOP;

    -- ========================================================================
    -- CRIAR FOREIGN KEYS (apenas FKs simples - 1 coluna)
    -- ========================================================================
    FOR r IN
        SELECT
            tc.table_name,
            tc.constraint_name,
            kcu.column_name AS fk_column,
            ccu.table_name AS ref_table,
            ccu.column_name AS ref_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.table_schema = v_source_schema
            AND tc.constraint_type = 'FOREIGN KEY'
            AND (SELECT COUNT(*) FROM information_schema.key_column_usage k
                 WHERE k.constraint_name = tc.constraint_name
                   AND k.table_schema = tc.table_schema) = 1
        ORDER BY tc.table_name
    LOOP
        v_new_constraint_name := REPLACE(r.constraint_name, v_source_schema, p_target_schema);

        BEGIN
            EXECUTE format(
                'ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I.%I(%I)',
                p_target_schema, r.table_name, v_new_constraint_name,
                r.fk_column, p_target_schema, r.ref_table, r.ref_column
            );
            v_fks_created := v_fks_created + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'FK erro em %: %', r.table_name, SQLERRM;
        END;
    END LOOP;

    -- ========================================================================
    -- CRIAR MATERIALIZED VIEWS
    -- ========================================================================
    FOR r IN
        SELECT matviewname, definition
        FROM pg_matviews
        WHERE schemaname = v_source_schema
        ORDER BY matviewname
    LOOP
        v_new_definition := REPLACE(r.definition, v_source_schema || '.', p_target_schema || '.');

        BEGIN
            EXECUTE format(
                'CREATE MATERIALIZED VIEW %I.%I AS %s',
                p_target_schema, r.matviewname, v_new_definition
            );
            v_mvs_created := v_mvs_created + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'MV erro em %: %', r.matviewname, SQLERRM;
        END;
    END LOOP;

    -- ========================================================================
    -- CRIAR FUNCTIONS
    -- ========================================================================
    FOR r IN
        SELECT p.oid, p.proname
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = v_source_schema
        ORDER BY p.proname
    LOOP
        v_func_def := pg_get_functiondef(r.oid);
        v_func_def := REPLACE(v_func_def, v_source_schema || '.', p_target_schema || '.');
        v_func_def := REPLACE(v_func_def, 'CREATE FUNCTION', 'CREATE OR REPLACE FUNCTION');

        BEGIN
            EXECUTE v_func_def;
            v_functions_created := v_functions_created + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Function erro em %: %', r.proname, SQLERRM;
        END;
    END LOOP;

    -- ========================================================================
    -- CRIAR TRIGGERS
    -- ========================================================================
    FOR r IN
        SELECT trigger_name, event_manipulation, event_object_table,
               action_timing, action_orientation, action_statement
        FROM information_schema.triggers
        WHERE trigger_schema = v_source_schema
        ORDER BY event_object_table, trigger_name
    LOOP
        v_trigger_sql := format(
            'CREATE TRIGGER %I %s %s ON %I.%I FOR EACH %s %s',
            r.trigger_name,
            r.action_timing,
            r.event_manipulation,
            p_target_schema,
            r.event_object_table,
            r.action_orientation,
            REPLACE(r.action_statement, v_source_schema || '.', p_target_schema || '.')
        );

        BEGIN
            EXECUTE v_trigger_sql;
            v_triggers_created := v_triggers_created + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Trigger erro em %: %', r.trigger_name, SQLERRM;
        END;
    END LOOP;

    -- ========================================================================
    -- CONFIGURAR PERMISSÕES (GRANTS)
    -- ========================================================================
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO anon, authenticated, service_role', p_target_schema);
    EXECUTE format('GRANT SELECT ON ALL TABLES IN SCHEMA %I TO anon, authenticated, service_role', p_target_schema);
    EXECUTE format('GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA %I TO authenticated, service_role', p_target_schema);
    EXECUTE format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA %I TO anon, authenticated, service_role', p_target_schema);
    EXECUTE format('GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA %I TO authenticated, service_role', p_target_schema);

    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT SELECT ON TABLES TO anon, authenticated, service_role', p_target_schema);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT INSERT, UPDATE, DELETE ON TABLES TO authenticated, service_role', p_target_schema);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role', p_target_schema);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT EXECUTE ON FUNCTIONS TO authenticated, service_role', p_target_schema);

    RAISE NOTICE 'Permissões configuradas para schema %', p_target_schema;

    -- ========================================================================
    -- COPIAR DADOS DE REFERÊNCIA
    -- ========================================================================
    BEGIN
        EXECUTE format('INSERT INTO %I.departments_level_6 SELECT * FROM %I.departments_level_6 ON CONFLICT DO NOTHING', p_target_schema, v_source_schema);
        EXECUTE format('INSERT INTO %I.departments_level_5 SELECT * FROM %I.departments_level_5 ON CONFLICT DO NOTHING', p_target_schema, v_source_schema);
        EXECUTE format('INSERT INTO %I.departments_level_4 SELECT * FROM %I.departments_level_4 ON CONFLICT DO NOTHING', p_target_schema, v_source_schema);
        EXECUTE format('INSERT INTO %I.departments_level_3 SELECT * FROM %I.departments_level_3 ON CONFLICT DO NOTHING', p_target_schema, v_source_schema);
        EXECUTE format('INSERT INTO %I.departments_level_2 SELECT * FROM %I.departments_level_2 ON CONFLICT DO NOTHING', p_target_schema, v_source_schema);
        EXECUTE format('INSERT INTO %I.departments_level_1 SELECT * FROM %I.departments_level_1 ON CONFLICT DO NOTHING', p_target_schema, v_source_schema);
        EXECUTE format('INSERT INTO %I.departamentos_nivel1 SELECT * FROM %I.departamentos_nivel1 ON CONFLICT DO NOTHING', p_target_schema, v_source_schema);
        EXECUTE format('INSERT INTO %I.tipos_despesa SELECT * FROM %I.tipos_despesa ON CONFLICT DO NOTHING', p_target_schema, v_source_schema);
        EXECUTE format('INSERT INTO %I.motivos_perda SELECT * FROM %I.motivos_perda ON CONFLICT DO NOTHING', p_target_schema, v_source_schema);
        RAISE NOTICE 'Dados de referência copiados';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao copiar dados de referência: %', SQLERRM;
    END;

    -- ========================================================================
    -- ANALYZE TABELAS
    -- ========================================================================
    FOR r IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = p_target_schema
          AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('ANALYZE %I.%I', p_target_schema, r.table_name);
    END LOOP;
    RAISE NOTICE 'ANALYZE completo';

    -- ========================================================================
    -- RETORNAR SUCESSO
    -- ========================================================================
    RETURN json_build_object(
        'success', true,
        'schema', p_target_schema,
        'tables_created', v_tables_created,
        'indexes_created', v_indexes_created,
        'primary_keys_created', v_pks_created,
        'unique_constraints_created', v_unique_created,
        'foreign_keys_created', v_fks_created,
        'materialized_views_created', v_mvs_created,
        'functions_created', v_functions_created,
        'triggers_created', v_triggers_created
    );

EXCEPTION WHEN OTHERS THEN
    -- Rollback: dropar schema se criado parcialmente (APENAS O NOVO!)
    -- Verifica se o schema foi criado antes de tentar dropar
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = p_target_schema) THEN
        EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', p_target_schema);
        RAISE NOTICE 'Schema % removido devido a erro', p_target_schema;
    END IF;

    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- ============================================================================
-- PERMISSÕES DA FUNCTION
-- ============================================================================
-- Remove acesso público e permite apenas service_role executar
-- Isso garante que apenas o backend (com service_role key) pode criar schemas

REVOKE ALL ON FUNCTION public.clone_schema_for_tenant(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clone_schema_for_tenant(TEXT) TO service_role;

-- ============================================================================
-- COMENTÁRIO DA FUNCTION
-- ============================================================================
COMMENT ON FUNCTION public.clone_schema_for_tenant(TEXT) IS
'Clona a estrutura completa do schema okilao para criar um novo tenant.
Usado pelo sistema quando um superadmin cria uma nova empresa.
ATENÇÃO: Após criar o schema, é necessário adicioná-lo manualmente aos
"Exposed schemas" no Supabase Dashboard (Settings → API).';
