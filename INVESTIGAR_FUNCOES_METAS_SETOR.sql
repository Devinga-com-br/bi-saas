-- ============================================================================
-- SCRIPT DE INVESTIGAÇÃO: Funções de Metas por Setor
-- ============================================================================

-- 1. LISTAR TODAS AS FUNÇÕES DE METAS_SETOR
SELECT
    n.nspname as schema,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as parameters,
    pg_get_functiondef(p.oid) as definition_preview
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname LIKE '%metas_setor%'
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY n.nspname, p.proname;

-- ============================================================================
-- 2. VERIFICAR ESTRUTURA DA TABELA SETORES
-- ============================================================================
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'SEU_SCHEMA'  -- ⚠️ SUBSTITUIR pelo schema real
  AND table_name = 'setores'
ORDER BY ordinal_position;

-- ============================================================================
-- 3. VERIFICAR ESTRUTURA DA TABELA METAS_SETOR
-- ============================================================================
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'SEU_SCHEMA'  -- ⚠️ SUBSTITUIR pelo schema real
  AND table_name = 'metas_setor'
ORDER BY ordinal_position;

-- ============================================================================
-- 4. VERIFICAR SE EXISTEM REGISTROS EM SETORES
-- ============================================================================
-- Substituir 'SEU_SCHEMA' pelo schema real
SELECT
    id,
    nome,
    CASE
        WHEN departamento_ids IS NOT NULL THEN array_length(departamento_ids, 1)
        ELSE 0
    END as qtd_departamentos,
    departamento_ids
FROM SEU_SCHEMA.setores
ORDER BY id
LIMIT 10;

-- ============================================================================
-- 5. VERIFICAR QUAL FUNÇÃO ESTÁ SENDO USADA PELA API
-- ============================================================================
-- Execute no terminal do projeto:
-- grep -r "get_metas_setor" src/app/api/metas/setor/

-- ============================================================================
-- 6. TESTAR FUNÇÃO EXISTENTE (depois de identificar a estrutura)
-- ============================================================================
-- SELECT * FROM get_metas_setor_report_optimized(
--   'SEU_SCHEMA',
--   1,  -- setor_id que existe
--   11,
--   2024,
--   NULL
-- );

-- ============================================================================
-- RESUMO DAS FUNÇÕES ENCONTRADAS (baseado na screenshot):
-- ============================================================================
-- 1. get_metas_setor_report (2 versões diferentes)
--    - Versão 1: (p_schema, p_setor_id, p_mes, p_ano, ...) → json
--    - Versão 2: (p_schema, p_mes, p_ano, ...) → jsonb
--
-- 2. get_metas_setor_report_optimized
--    - (p_schema, p_setor_id, p_mes, p_ano, p_filial_ids[]) → jsonb
--
-- 3. get_metas_setores_report
--    - (p_schema, p_mes, p_ano, ...) → jsonb
--
-- ============================================================================
-- RECOMENDAÇÃO DE LIMPEZA:
-- ============================================================================
-- MANTER: get_metas_setor_report_optimized (mais recente e otimizada)
-- REMOVER: Outras versões antigas após validar que não quebra nada
