-- ======================================
-- COPIE E COLE ESTE SQL NO SUPABASE
-- ======================================

-- Remover coluna situacao de todos os schemas
DO $$
DECLARE
  tenant_record RECORD;
  column_exists boolean;
BEGIN
  RAISE NOTICE '=== Iniciando remoção da coluna situacao ===';
  
  FOR tenant_record IN 
    SELECT supabase_schema 
    FROM public.tenants 
    WHERE supabase_schema IS NOT NULL
    ORDER BY supabase_schema
  LOOP
    BEGIN
      -- Verificar se a coluna existe
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
        -- Remover a coluna
        EXECUTE format('
          ALTER TABLE %I.metas_mensais 
          DROP COLUMN situacao CASCADE
        ', tenant_record.supabase_schema);
        
        RAISE NOTICE '✓ Schema %: coluna situacao REMOVIDA', tenant_record.supabase_schema;
      ELSE
        RAISE NOTICE '✓ Schema %: coluna situacao já não existe', tenant_record.supabase_schema;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '✗ Schema %: erro ao remover coluna - %', tenant_record.supabase_schema, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '=== Remoção concluída ===';
END $$;

-- Verificar resultado: listar todas as colunas da tabela metas_mensais
SELECT 
  table_schema as schema,
  column_name as coluna,
  data_type as tipo
FROM information_schema.columns
WHERE table_name = 'metas_mensais'
  AND table_schema IN (SELECT supabase_schema FROM public.tenants WHERE supabase_schema IS NOT NULL)
ORDER BY table_schema, ordinal_position;
