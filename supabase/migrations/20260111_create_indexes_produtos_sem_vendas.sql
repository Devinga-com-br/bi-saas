-- =====================================================
-- CREATE INDEXES - Produtos Sem Vendas Performance
-- Execute no Supabase SQL Editor
-- =====================================================

-- ⚠️  IMPORTANTE: Execute para cada schema (saoluiz, okilao, paraiso, lucia)
-- Substitua 'saoluiz' pelo schema desejado

-- SCHEMA: saoluiz
-- ========================================

-- Índice: Produtos sem vendas (filial + ativo + estoque)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saoluiz_produtos_sem_vendas
  ON saoluiz.produtos (filial_id, ativo, estoque_atual)
  WHERE ativo = true AND estoque_atual > 0;

-- Índice: Produtos por curva ABC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saoluiz_produtos_curva
  ON saoluiz.produtos (curva_abcd, filial_id)
  WHERE ativo = true;

-- Índice: Última venda histórica
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saoluiz_vendas_ultima
  ON saoluiz.vendas (id_produto, filial_id, data_venda DESC);

-- Índice: Última venda hoje
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saoluiz_vendas_hoje_ultima
  ON saoluiz.vendas_hoje_itens (produto_id, filial_id, data_extracao DESC)
  WHERE cancelado = false;

-- ========================================
-- Verificar índices criados:
-- ========================================
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'saoluiz'
  AND indexname LIKE 'idx_saoluiz%'
ORDER BY tablename, indexname;

-- ========================================
-- Estatísticas (executar após criar índices):
-- ========================================
ANALYZE saoluiz.produtos;
ANALYZE saoluiz.vendas;
ANALYZE saoluiz.vendas_hoje_itens;
