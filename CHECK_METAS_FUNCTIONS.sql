-- ================================================================
-- VERIFICAR FUNÇÕES DE METAS
-- ================================================================

-- 1. Listar todas as funções relacionadas a metas
SELECT
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
LEFT JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname LIKE '%meta%'
  AND n.nspname = 'public'
ORDER BY p.proname;
