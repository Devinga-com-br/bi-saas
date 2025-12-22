-- ============================================================================
-- CLONE SCHEMA: okilao -> merlyn
-- VERSÃO EXECUTÁVEL DIRETA
-- ============================================================================
--
-- COMO USAR:
-- Execute cada bloco separadamente no Supabase SQL Editor
-- NÃO precisa copiar resultados - cada bloco executa diretamente
--
-- ============================================================================

-- ============================================================================
-- BLOCO 1: CRIAR SCHEMA (execute diretamente)
-- ============================================================================

DROP SCHEMA IF EXISTS merlyn CASCADE;
CREATE SCHEMA merlyn;

-- ============================================================================
-- BLOCO 2: CRIAR TABELAS (execute diretamente)
-- ============================================================================
-- Usa dynamic SQL para criar todas as tabelas automaticamente

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'okilao'
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
    LOOP
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS merlyn.%I AS SELECT * FROM okilao.%I WHERE 1=0',
            r.table_name, r.table_name
        );
        RAISE NOTICE 'Tabela criada: %', r.table_name;
    END LOOP;
END $$;

-- ============================================================================
-- BLOCO 3: ADICIONAR PRIMARY KEYS (execute diretamente)
-- ============================================================================

DO $$
DECLARE
    r RECORD;
    pk_columns TEXT;
BEGIN
    FOR r IN
        SELECT DISTINCT tc.table_name, tc.constraint_name
        FROM information_schema.table_constraints tc
        WHERE tc.table_schema = 'okilao'
          AND tc.constraint_type = 'PRIMARY KEY'
          -- Só adiciona se não existir no merlyn
          AND NOT EXISTS (
              SELECT 1 FROM information_schema.table_constraints dst
              WHERE dst.table_schema = 'merlyn'
                AND dst.table_name = tc.table_name
                AND dst.constraint_type = 'PRIMARY KEY'
          )
        ORDER BY tc.table_name
    LOOP
        -- Pegar as colunas da PK
        SELECT string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position)
        INTO pk_columns
        FROM information_schema.key_column_usage kcu
        WHERE kcu.constraint_name = r.constraint_name
          AND kcu.table_schema = 'okilao';

        BEGIN
            EXECUTE format(
                'ALTER TABLE merlyn.%I ADD PRIMARY KEY (%s)',
                r.table_name, pk_columns
            );
            RAISE NOTICE 'PK adicionada: %.%', r.table_name, pk_columns;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'PK já existe ou erro em %: %', r.table_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- ============================================================================
-- BLOCO 4: ADICIONAR UNIQUE CONSTRAINTS (execute diretamente)
-- ============================================================================

DO $$
DECLARE
    r RECORD;
    unique_columns TEXT;
    new_constraint_name TEXT;
BEGIN
    FOR r IN
        SELECT DISTINCT tc.table_name, tc.constraint_name
        FROM information_schema.table_constraints tc
        WHERE tc.table_schema = 'okilao'
          AND tc.constraint_type = 'UNIQUE'
          AND NOT EXISTS (
              SELECT 1 FROM information_schema.table_constraints dst
              WHERE dst.table_schema = 'merlyn'
                AND dst.table_name = tc.table_name
                AND dst.constraint_type = 'UNIQUE'
                AND (dst.constraint_name = tc.constraint_name
                     OR dst.constraint_name = REPLACE(tc.constraint_name, 'okilao', 'merlyn'))
          )
        ORDER BY tc.table_name
    LOOP
        SELECT string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position)
        INTO unique_columns
        FROM information_schema.key_column_usage kcu
        WHERE kcu.constraint_name = r.constraint_name
          AND kcu.table_schema = 'okilao';

        new_constraint_name := REPLACE(r.constraint_name, 'okilao', 'merlyn');

        BEGIN
            EXECUTE format(
                'ALTER TABLE merlyn.%I ADD CONSTRAINT %I UNIQUE (%s)',
                r.table_name, new_constraint_name, unique_columns
            );
            RAISE NOTICE 'UNIQUE adicionado: %.%', r.table_name, unique_columns;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'UNIQUE já existe ou erro em %: %', r.table_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- ============================================================================
-- BLOCO 5: CRIAR ÍNDICES (execute diretamente)
-- ============================================================================

DO $$
DECLARE
    r RECORD;
    new_indexname TEXT;
    new_indexdef TEXT;
BEGIN
    FOR r IN
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'okilao'
          AND indexname NOT LIKE '%_pkey'
          AND NOT EXISTS (
              SELECT 1 FROM pg_indexes dst
              WHERE dst.schemaname = 'merlyn'
                AND (dst.indexname = pg_indexes.indexname
                     OR dst.indexname = REPLACE(pg_indexes.indexname, 'okilao', 'merlyn'))
          )
        ORDER BY tablename, indexname
    LOOP
        new_indexname := REPLACE(r.indexname, 'okilao', 'merlyn');
        new_indexdef := REPLACE(r.indexdef, 'okilao.', 'merlyn.');
        new_indexdef := REPLACE(new_indexdef, 'INDEX ' || r.indexname, 'INDEX ' || new_indexname);

        BEGIN
            EXECUTE new_indexdef;
            RAISE NOTICE 'Índice criado: %', new_indexname;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Índice já existe ou erro em %: %', new_indexname, SQLERRM;
        END;
    END LOOP;
END $$;

-- ============================================================================
-- BLOCO 6: CRIAR FOREIGN KEYS (execute diretamente)
-- ============================================================================
-- NOTA: FKs com chaves compostas precisam de tratamento especial

DO $$
DECLARE
    r RECORD;
    new_constraint_name TEXT;
BEGIN
    -- Query corrigida para FKs simples (1 coluna)
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
        WHERE tc.table_schema = 'okilao'
            AND tc.constraint_type = 'FOREIGN KEY'
            -- Apenas FKs simples (1 coluna)
            AND (SELECT COUNT(*) FROM information_schema.key_column_usage k
                 WHERE k.constraint_name = tc.constraint_name
                   AND k.table_schema = tc.table_schema) = 1
            AND NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints dst
                WHERE dst.table_schema = 'merlyn'
                  AND dst.table_name = tc.table_name
                  AND dst.constraint_type = 'FOREIGN KEY'
                  AND (dst.constraint_name = tc.constraint_name
                       OR dst.constraint_name = REPLACE(tc.constraint_name, 'okilao', 'merlyn'))
            )
        ORDER BY tc.table_name
    LOOP
        new_constraint_name := REPLACE(r.constraint_name, 'okilao', 'merlyn');

        BEGIN
            EXECUTE format(
                'ALTER TABLE merlyn.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES merlyn.%I(%I)',
                r.table_name, new_constraint_name, r.fk_column, r.ref_table, r.ref_column
            );
            RAISE NOTICE 'FK adicionada: % -> %.%', r.table_name, r.ref_table, r.ref_column;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'FK já existe ou erro em %: %', r.table_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- ============================================================================
-- BLOCO 7: CRIAR MATERIALIZED VIEWS (execute diretamente)
-- ============================================================================

DO $$
DECLARE
    r RECORD;
    new_definition TEXT;
BEGIN
    FOR r IN
        SELECT matviewname, definition
        FROM pg_matviews
        WHERE schemaname = 'okilao'
          AND NOT EXISTS (
              SELECT 1 FROM pg_matviews dst
              WHERE dst.schemaname = 'merlyn'
                AND dst.matviewname = pg_matviews.matviewname
          )
        ORDER BY matviewname
    LOOP
        new_definition := REPLACE(r.definition, 'okilao.', 'merlyn.');

        BEGIN
            EXECUTE format(
                'CREATE MATERIALIZED VIEW merlyn.%I AS %s',
                r.matviewname, new_definition
            );
            RAISE NOTICE 'MV criada: %', r.matviewname;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'MV já existe ou erro em %: %', r.matviewname, SQLERRM;
        END;
    END LOOP;
END $$;

-- ============================================================================
-- BLOCO 8: CRIAR FUNCTIONS (execute diretamente)
-- ============================================================================

DO $$
DECLARE
    r RECORD;
    func_def TEXT;
BEGIN
    FOR r IN
        SELECT p.oid, p.proname
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'okilao'
        ORDER BY p.proname
    LOOP
        func_def := pg_get_functiondef(r.oid);
        func_def := REPLACE(func_def, 'okilao.', 'merlyn.');
        func_def := REPLACE(func_def, 'CREATE FUNCTION', 'CREATE OR REPLACE FUNCTION');

        BEGIN
            EXECUTE func_def;
            RAISE NOTICE 'Function criada: %', r.proname;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Function erro em %: %', r.proname, SQLERRM;
        END;
    END LOOP;
END $$;

-- ============================================================================
-- BLOCO 9: CRIAR TRIGGERS (execute diretamente)
-- ============================================================================

DO $$
DECLARE
    r RECORD;
    trigger_sql TEXT;
BEGIN
    FOR r IN
        SELECT trigger_name, event_manipulation, event_object_table,
               action_timing, action_orientation, action_statement
        FROM information_schema.triggers
        WHERE trigger_schema = 'okilao'
          AND NOT EXISTS (
              SELECT 1 FROM information_schema.triggers dst
              WHERE dst.trigger_schema = 'merlyn'
                AND dst.trigger_name = information_schema.triggers.trigger_name
                AND dst.event_object_table = information_schema.triggers.event_object_table
          )
        ORDER BY event_object_table, trigger_name
    LOOP
        trigger_sql := format(
            'CREATE TRIGGER %I %s %s ON merlyn.%I FOR EACH %s %s',
            r.trigger_name,
            r.action_timing,
            r.event_manipulation,
            r.event_object_table,
            r.action_orientation,
            REPLACE(r.action_statement, 'okilao.', 'merlyn.')
        );

        BEGIN
            EXECUTE trigger_sql;
            RAISE NOTICE 'Trigger criado: % em %', r.trigger_name, r.event_object_table;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Trigger já existe ou erro em %: %', r.trigger_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- ============================================================================
-- BLOCO 10: PERMISSÕES (execute diretamente)
-- ============================================================================

GRANT USAGE ON SCHEMA merlyn TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA merlyn TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA merlyn TO authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA merlyn TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA merlyn TO authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA merlyn GRANT SELECT ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA merlyn GRANT INSERT, UPDATE, DELETE ON TABLES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA merlyn GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA merlyn GRANT EXECUTE ON FUNCTIONS TO authenticated, service_role;

-- ============================================================================
-- BLOCO 11: REGISTRAR TENANT (execute diretamente)
-- ============================================================================

INSERT INTO public.tenants (name, slug, supabase_schema, is_active, created_at)
VALUES ('Merlyn', 'merlyn', 'merlyn', true, NOW())
ON CONFLICT (supabase_schema) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug, updated_at = NOW();

-- ============================================================================
-- BLOCO 12: COPIAR DADOS DE REFERÊNCIA (execute diretamente)
-- ============================================================================

INSERT INTO merlyn.departments_level_6 SELECT * FROM okilao.departments_level_6 ON CONFLICT DO NOTHING;
INSERT INTO merlyn.departments_level_5 SELECT * FROM okilao.departments_level_5 ON CONFLICT DO NOTHING;
INSERT INTO merlyn.departments_level_4 SELECT * FROM okilao.departments_level_4 ON CONFLICT DO NOTHING;
INSERT INTO merlyn.departments_level_3 SELECT * FROM okilao.departments_level_3 ON CONFLICT DO NOTHING;
INSERT INTO merlyn.departments_level_2 SELECT * FROM okilao.departments_level_2 ON CONFLICT DO NOTHING;
INSERT INTO merlyn.departments_level_1 SELECT * FROM okilao.departments_level_1 ON CONFLICT DO NOTHING;
INSERT INTO merlyn.departamentos_nivel1 SELECT * FROM okilao.departamentos_nivel1 ON CONFLICT DO NOTHING;
INSERT INTO merlyn.tipos_despesa SELECT * FROM okilao.tipos_despesa ON CONFLICT DO NOTHING;
INSERT INTO merlyn.motivos_perda SELECT * FROM okilao.motivos_perda ON CONFLICT DO NOTHING;

-- ============================================================================
-- BLOCO 13: ANALYZE (execute diretamente)
-- ============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'merlyn'
          AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('ANALYZE merlyn.%I', r.table_name);
    END LOOP;
    RAISE NOTICE 'ANALYZE completo em todas as tabelas';
END $$;

-- ============================================================================
-- BLOCO 14: VERIFICAÇÃO FINAL (execute para conferir)
-- ============================================================================

SELECT
    'CLONE COMPLETO!' AS status,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'merlyn' AND table_type = 'BASE TABLE') AS tabelas,
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'merlyn') AS indices,
    (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'merlyn') AS functions,
    (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'merlyn') AS triggers,
    (SELECT COUNT(*) FROM pg_matviews WHERE schemaname = 'merlyn') AS materialized_views;

-- ============================================================================
-- ⚠️ LEMBRETE CRÍTICO!
-- ============================================================================
--
-- Após executar todos os blocos, vá ao Supabase Dashboard:
--
-- 1. Settings → API
-- 2. Campo "Exposed schemas"
-- 3. Adicione 'merlyn' à lista:
--    public, graphql_public, okilao, saoluiz, paraiso, lucia, sol, merlyn
-- 4. Salve e aguarde 1-2 minutos
--
-- Sem isso, você receberá erro PGRST106!
-- ============================================================================
