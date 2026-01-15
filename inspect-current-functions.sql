-- ============================================================================
-- SCRIPT: Inspeção de Funções Atuais - Metas Mensais
-- ============================================================================
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- Objetivo: Extrair definições REAIS das funções antes de alterá-las
-- ============================================================================

\echo '========================================';
\echo 'ANÁLISE 1: Estrutura da Tabela metas_mensais';
\echo '========================================';
\echo '';

-- Ver estrutura atual da tabela em TODOS os schemas
SELECT 
    table_schema,
    column_name,
    data_type,
    character_maximum_length,
    numeric_precision,
    numeric_scale,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'metas_mensais'
  AND table_schema IN ('demo', 'okilao', 'saoluiz', 'paraiso', 'lucia', 'sol')
ORDER BY table_schema, ordinal_position;

\echo '';
\echo '========================================';
\echo 'ANÁLISE 2: Função atualizar_valores_realizados_metas';
\echo '========================================';
\echo '';

-- Ver definição completa da função de atualização
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'atualizar_valores_realizados_metas'
  AND n.nspname = 'public';

\echo '';
\echo '========================================';
\echo 'ANÁLISE 3: Função get_metas_mensais_report';
\echo '========================================';
\echo '';

-- Ver definição completa da função de relatório
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'get_metas_mensais_report'
  AND n.nspname = 'public';

\echo '';
\echo '========================================';
\echo 'ANÁLISE 4: Função generate_metas_mensais (se existir)';
\echo '========================================';
\echo '';

-- Verificar se existe função de geração de metas
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname LIKE '%generate%meta%'
  AND n.nspname = 'public';

\echo '';
\echo '========================================';
\echo 'ANÁLISE 5: Todas as Funções Relacionadas a Metas';
\echo '========================================';
\echo '';

-- Listar TODAS as funções que mencionam 'meta' no nome
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type,
    l.lanname as language
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_language l ON p.prolang = l.oid
WHERE (p.proname LIKE '%meta%' OR p.proname LIKE '%Meta%')
  AND n.nspname = 'public'
ORDER BY p.proname;

\echo '';
\echo '========================================';
\echo 'ANÁLISE 6: Verificar se Tabela Existe em Cada Schema';
\echo '========================================';
\echo '';

-- Verificar existência da tabela em cada schema
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE tablename = 'metas_mensais'
  AND schemaname IN ('demo', 'okilao', 'saoluiz', 'paraiso', 'lucia', 'sol')
ORDER BY schemaname;

\echo '';
\echo '========================================';
\echo 'FIM DA ANÁLISE';
\echo '========================================';
