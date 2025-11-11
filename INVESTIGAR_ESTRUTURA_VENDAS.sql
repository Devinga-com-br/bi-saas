-- =====================================================
-- INVESTIGAÇÃO: Como relacionar vendas com setores?
-- =====================================================

-- URGENTE: A tabela vendas NÃO tem coluna setor_id!
-- Precisamos descobrir como fazer a relação vendas -> setor

-- PASSO 1: Ver TODAS as colunas da tabela vendas
-- ================================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'sol'  -- ⚠️ SUBSTITUIR pelo seu schema
  AND table_name = 'vendas'
ORDER BY ordinal_position;


-- PASSO 2: Verificar se existe tabela produtos
-- =============================================
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'sol'  -- ⚠️ SUBSTITUIR
  AND table_name LIKE '%produto%';


-- PASSO 3: Ver estrutura da tabela produtos (se existir)
-- =======================================================
SELECT 
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'sol'  -- ⚠️ SUBSTITUIR
  AND table_name = 'produtos'
ORDER BY ordinal_position;


-- PASSO 4: Amostra de dados das vendas
-- =====================================
SELECT *
FROM sol.vendas  -- ⚠️ SUBSTITUIR
LIMIT 5;


-- PASSO 5: Amostra de dados dos produtos (se existir)
-- ====================================================
SELECT *
FROM sol.produtos  -- ⚠️ SUBSTITUIR
LIMIT 5;


-- =====================================================
-- POSSÍVEIS CENÁRIOS:
-- =====================================================

/*
CENÁRIO A: vendas tem produto_id → produtos tem setor_id
  Solução: JOIN vendas -> produtos -> setores

CENÁRIO B: vendas tem codigo_produto → produtos tem codigo + setor_id
  Solução: JOIN vendas -> produtos (via codigo) -> setores

CENÁRIO C: vendas tem departamento_id que é o mesmo que setor_id
  Solução: Renomear departamento_id para setor_id

CENÁRIO D: vendas NÃO tem relação com setores
  Solução: Adicionar coluna setor_id na tabela vendas

👉 Execute os passos acima e me envie os resultados!
   Principalmente PASSO 1, 4 e 5
*/
