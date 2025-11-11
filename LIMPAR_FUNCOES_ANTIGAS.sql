-- =====================================================
-- LIMPEZA: Remover funções antigas de metas por setor
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- IMPORTANTE: Este script remove APENAS as funções que não são mais usadas
-- As funções corretas (criadas pelo APPLY_FIX_METAS_SETOR.sql) serão mantidas

-- =====================================================
-- PASSO 1: Verificar quais funções existem
-- =====================================================
SELECT 
  routine_name,
  routine_type,
  specific_name,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%metas%'
ORDER BY routine_name;

-- Resultado esperado: você verá todas as funções relacionadas a metas
-- Anote quais aparecem para confirmar


-- =====================================================
-- PASSO 2: Remover funções ANTIGAS (se existirem)
-- =====================================================

-- Função antiga que retornava RECORD ao invés de JSONB
DROP FUNCTION IF EXISTS public.atualizar_valores_realizados_metas_setor(text, bigint, integer, integer, bigint) CASCADE;

-- Função antiga de metas (não de metas_setor)
DROP FUNCTION IF EXISTS public.atualizar_valores_realizados_metas(text, integer, integer) CASCADE;

-- Função antiga de setor (nome diferente)
DROP FUNCTION IF EXISTS public.atualizar_valores_realizados_setor(text, bigint, integer, integer, bigint) CASCADE;

-- Outras possíveis variações antigas
DROP FUNCTION IF EXISTS public.update_metas_setor_valores(text, bigint, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_metas_setor(text, bigint, integer, integer) CASCADE;


-- =====================================================
-- PASSO 3: Verificar funções que DEVEM PERMANECER
-- =====================================================

-- Estas funções são as CORRETAS e devem existir:

-- 1. atualizar_valores_realizados_metas_setor (JSONB, com hierarquia)
--    Assinatura: (text, bigint, integer, integer, bigint DEFAULT NULL) RETURNS jsonb

-- 2. atualizar_valores_realizados_todos_setores (itera todos setores)
--    Assinatura: (text, integer, integer) RETURNS jsonb

SELECT 
  routine_name,
  data_type as return_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'atualizar_valores_realizados_metas_setor',
    'atualizar_valores_realizados_todos_setores'
  )
ORDER BY routine_name;

-- Resultado esperado:
-- atualizar_valores_realizados_metas_setor | jsonb | (deve conter 'departments_level_1')
-- atualizar_valores_realizados_todos_setores | jsonb


-- =====================================================
-- PASSO 4: Verificar se há funções duplicadas
-- =====================================================

-- Se houver DUAS versões da mesma função, precisamos remover a antiga
-- Execute esta query para ver:

SELECT 
  routine_name,
  COUNT(*) as qtd_versoes,
  string_agg(specific_name, ', ') as versoes
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%atualizar_valores_realizados_metas_setor%'
GROUP BY routine_name
HAVING COUNT(*) > 1;

-- Se retornar algum resultado, há duplicatas!
-- Para remover todas as versões e recriar:

-- DROP FUNCTION IF EXISTS public.atualizar_valores_realizados_metas_setor CASCADE;
-- (Depois execute novamente o APPLY_FIX_METAS_SETOR.sql)


-- =====================================================
-- OUTRAS FUNÇÕES DE METAS (NÃO RELACIONADAS A SETOR)
-- =====================================================

-- Estas funções são de outros módulos e DEVEM SER MANTIDAS:

-- 1. generate_metas_mensais (módulo de Metas Mensais)
-- 2. get_metas_mensais_report (relatório de Metas Mensais)
-- 3. atualizar_valores_realizados_metas (Metas Mensais, não Metas SETOR)

-- NÃO delete estas funções! Elas são de outros módulos.


-- =====================================================
-- RESUMO FINAL
-- =====================================================

/*
✅ FUNÇÕES QUE DEVEM EXISTIR (Metas por Setor):
   - atualizar_valores_realizados_metas_setor (JSONB, com departments_level_1)
   - atualizar_valores_realizados_todos_setores (JSONB)

✅ FUNÇÕES QUE DEVEM EXISTIR (Metas Mensais):
   - generate_metas_mensais
   - get_metas_mensais_report
   - atualizar_valores_realizados_metas

❌ FUNÇÕES QUE PODEM SER REMOVIDAS:
   - atualizar_valores_realizados_setor (nome diferente)
   - Qualquer função que retorna RECORD ao invés de JSONB
   - Qualquer função que não usa departments_level_1

📝 RECOMENDAÇÃO:
   Execute o PASSO 1 primeiro, copie o resultado e me envie
   para eu confirmar quais devem ser deletadas!
*/
