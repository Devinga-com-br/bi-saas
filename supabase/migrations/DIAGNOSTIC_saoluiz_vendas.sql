-- ============================================================================
-- DIAGNÓSTICO: Estrutura da tabela saoluiz.vendas
-- ============================================================================
-- Execute ESTE arquivo PRIMEIRO para diagnosticar o problema
-- Data: 2026-01-07
-- ============================================================================

-- ============================================================================
-- 1. Listar TODAS as colunas da tabela vendas
-- ============================================================================
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'saoluiz'
  AND table_name = 'vendas'
ORDER BY ordinal_position;

-- ============================================================================
-- 2. Verificar se colunas essenciais existem
-- ============================================================================
DO $$
DECLARE
  v_has_id_produto boolean;
  v_has_filial_id boolean;
  v_has_valor_vendas boolean;
  v_has_data_venda boolean;
  v_quantidade_col text := NULL;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DIAGNÓSTICO: Tabela saoluiz.vendas';
  RAISE NOTICE '========================================';
  
  -- Verificar colunas obrigatórias
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'saoluiz' AND table_name = 'vendas' AND column_name = 'id_produto') INTO v_has_id_produto;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'saoluiz' AND table_name = 'vendas' AND column_name = 'filial_id') INTO v_has_filial_id;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'saoluiz' AND table_name = 'vendas' AND column_name = 'valor_vendas') INTO v_has_valor_vendas;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'saoluiz' AND table_name = 'vendas' AND column_name = 'data_venda') INTO v_has_data_venda;
  
  IF v_has_id_produto THEN
    RAISE NOTICE '✅ Coluna id_produto: OK';
  ELSE
    RAISE WARNING '❌ Coluna id_produto: NÃO ENCONTRADA';
  END IF;
  
  IF v_has_filial_id THEN
    RAISE NOTICE '✅ Coluna filial_id: OK';
  ELSE
    RAISE WARNING '❌ Coluna filial_id: NÃO ENCONTRADA';
  END IF;
  
  IF v_has_valor_vendas THEN
    RAISE NOTICE '✅ Coluna valor_vendas: OK';
  ELSE
    RAISE WARNING '❌ Coluna valor_vendas: NÃO ENCONTRADA';
  END IF;
  
  IF v_has_data_venda THEN
    RAISE NOTICE '✅ Coluna data_venda: OK';
  ELSE
    RAISE WARNING '❌ Coluna data_venda: NÃO ENCONTRADA';
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Verificando coluna de QUANTIDADE:';
  RAISE NOTICE '========================================';
  
  -- Verificar diferentes nomes possíveis para quantidade
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'saoluiz' AND table_name = 'vendas' AND column_name = 'quantidade') THEN
    v_quantidade_col := 'quantidade';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'saoluiz' AND table_name = 'vendas' AND column_name = 'qtd') THEN
    v_quantidade_col := 'qtd';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'saoluiz' AND table_name = 'vendas' AND column_name = 'qtde') THEN
    v_quantidade_col := 'qtde';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'saoluiz' AND table_name = 'vendas' AND column_name = 'qtd_vendida') THEN
    v_quantidade_col := 'qtd_vendida';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'saoluiz' AND table_name = 'vendas' AND column_name = 'quantidade_vendida') THEN
    v_quantidade_col := 'quantidade_vendida';
  END IF;
  
  IF v_quantidade_col IS NOT NULL THEN
    RAISE NOTICE '✅ Coluna de quantidade: % (ENCONTRADA)', v_quantidade_col;
  ELSE
    RAISE WARNING '❌ Coluna de quantidade: NÃO ENCONTRADA';
    RAISE WARNING '   Nomes testados: quantidade, qtd, qtde, qtd_vendida, quantidade_vendida';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- 3. Mostrar sample de dados (primeiros 3 registros)
-- ============================================================================
SELECT 
  'Sample de dados' as tipo,
  *
FROM saoluiz.vendas
LIMIT 3;

-- ============================================================================
-- 4. Verificar estrutura da tabela produtos
-- ============================================================================
SELECT 
  'produtos' as tabela,
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_schema = 'saoluiz'
  AND table_name = 'produtos'
  AND column_name IN ('id', 'filial_id', 'departamento_id')
ORDER BY ordinal_position;

-- ============================================================================
-- INSTRUÇÕES
-- ============================================================================
-- Execute este arquivo e observe:
--
-- 1. Se TODAS as verificações mostram ✅, a estrutura está OK
-- 2. Se alguma mostra ❌, você precisa corrigir a tabela antes
-- 3. Anote o nome da coluna de quantidade encontrada
-- 4. Se não encontrou coluna de quantidade, verifique o sample de dados
--    para identificar qual coluna representa a quantidade vendida
-- ============================================================================
