-- =====================================================
-- CRIAR ÍNDICES - EXECUTE ISTO PARA PERFORMANCE MÁXIMA
-- =====================================================
-- Execute para o schema: saoluiz
-- Depois repita para outros schemas (okilao, paraiso, lucia)
-- =====================================================

-- 1. Índice principal: Produtos ativos com estoque
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saoluiz_produtos_ativo_estoque
  ON saoluiz.produtos (filial_id, id)
  WHERE ativo = true AND estoque_atual > 0;

-- 2. Índice para última venda (CRÍTICO!)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saoluiz_vendas_produto_data
  ON saoluiz.vendas (id_produto, filial_id, data_venda DESC);

-- 3. Índice para curva ABC (opcional mas recomendado)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saoluiz_produtos_curva
  ON saoluiz.produtos (curva_abcd)
  WHERE ativo = true;

-- =====================================================
-- VERIFICAR SE ÍNDICES FORAM CRIADOS
-- =====================================================
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'saoluiz'
  AND indexname LIKE 'idx_saoluiz%'
ORDER BY tablename, indexname;

-- =====================================================
-- ATUALIZAR ESTATÍSTICAS (IMPORTANTE!)
-- =====================================================
ANALYZE saoluiz.produtos;
ANALYZE saoluiz.vendas;
ANALYZE saoluiz.vendas_hoje_itens;
