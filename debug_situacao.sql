-- Script de diagnóstico: Verificar coluna situacao
-- Execute este script no console SQL do Supabase para diagnosticar o problema

-- 1. Verificar se a coluna situacao existe em cada schema
DO $$
DECLARE
  tenant_record RECORD;
  column_exists boolean;
BEGIN
  RAISE NOTICE '=== Verificando coluna situacao em metas_mensais ===';
  
  FOR tenant_record IN 
    SELECT supabase_schema 
    FROM public.tenants 
    WHERE supabase_schema IS NOT NULL
    ORDER BY supabase_schema
  LOOP
    -- Check if column exists
    EXECUTE format('
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = %L 
          AND table_name = ''metas_mensais'' 
          AND column_name = ''situacao''
      )', tenant_record.supabase_schema)
    INTO column_exists;
    
    IF column_exists THEN
      RAISE NOTICE 'Schema %: coluna situacao EXISTE', tenant_record.supabase_schema;
      
      -- Remover a coluna
      EXECUTE format('
        ALTER TABLE %I.metas_mensais 
        DROP COLUMN situacao CASCADE
      ', tenant_record.supabase_schema);
      
      RAISE NOTICE 'Schema %: coluna situacao REMOVIDA', tenant_record.supabase_schema;
    ELSE
      RAISE NOTICE 'Schema %: coluna situacao NÃO existe (OK)', tenant_record.supabase_schema;
    END IF;
  END LOOP;
  
  RAISE NOTICE '=== Verificação concluída ===';
END $$;

-- 2. Listar todas as colunas da tabela metas_mensais em cada schema
SELECT 
  table_schema,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'metas_mensais'
  AND table_schema IN (SELECT supabase_schema FROM public.tenants WHERE supabase_schema IS NOT NULL)
ORDER BY table_schema, ordinal_position;
