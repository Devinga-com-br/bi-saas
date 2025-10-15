-- Execute este SQL no Supabase Dashboard para remover a coluna situacao

-- Para o schema okilao
ALTER TABLE okilao.metas_mensais DROP COLUMN IF EXISTS situacao;

-- Para o schema paraiso (se existir)
ALTER TABLE paraiso.metas_mensais DROP COLUMN IF EXISTS situacao;

-- Para todos os schemas (alternativa genérica)
DO $$
DECLARE
  tenant_record RECORD;
BEGIN
  FOR tenant_record IN 
    SELECT supabase_schema 
    FROM public.tenants 
    WHERE supabase_schema IS NOT NULL
  LOOP
    EXECUTE format('
      ALTER TABLE %I.metas_mensais 
      DROP COLUMN IF EXISTS situacao
    ', tenant_record.supabase_schema);
    
    RAISE NOTICE 'Coluna situacao removida do schema %', tenant_record.supabase_schema;
  END LOOP;
END $$;
