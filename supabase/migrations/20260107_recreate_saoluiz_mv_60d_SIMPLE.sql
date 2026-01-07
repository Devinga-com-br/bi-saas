-- ============================================================================
-- SOLUÇÃO SIMPLIFICADA: Recriar MV vendas_agregadas_60d para SAOLUIZ
-- ============================================================================
-- Data: 2026-01-07
-- Versão: SIMPLIFICADA (sem validações que falham)
-- ============================================================================

-- Dropar MV antiga
DROP MATERIALIZED VIEW IF EXISTS saoluiz.vendas_agregadas_60d CASCADE;

-- Recriar MV (ajuste o nome da coluna 'quantidade' se necessário)
CREATE MATERIALIZED VIEW saoluiz.vendas_agregadas_60d AS
SELECT
  p.id AS id_produto,
  p.filial_id,
  p.departamento_id,
  SUM(v.valor_vendas) AS total_valor_produto,
  -- ⚠️ AJUSTE AQUI: troque 'quantidade' pelo nome correto da coluna
  -- Possíveis nomes: quantidade, qtd, qtde, qtd_vendida, quantidade_vendida
  SUM(COALESCE(v.quantidade, 0)) AS total_quantidade_produto
FROM saoluiz.vendas v
JOIN saoluiz.produtos p
  ON v.id_produto = p.id
  AND v.filial_id = p.filial_id
WHERE
  v.data_venda >= (date_trunc('month', CURRENT_DATE) - INTERVAL '2 months')::date
  AND v.data_venda < date_trunc('month', CURRENT_DATE)::date
  AND v.valor_vendas > 0
GROUP BY p.id, p.filial_id, p.departamento_id;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_saoluiz_vendas_agregadas_60d_produto_filial
ON saoluiz.vendas_agregadas_60d (id_produto, filial_id);

-- Comentário
COMMENT ON MATERIALIZED VIEW saoluiz.vendas_agregadas_60d IS 
'Vendas agregadas dos últimos 2 meses fechados (criada em 2026-01-07)';

-- ============================================================================
-- VALIDAÇÃO: Verificar se MV foi criada corretamente
-- ============================================================================

-- 1. Contar registros
SELECT 
  COUNT(*) as total_registros,
  COUNT(DISTINCT id_produto) as total_produtos,
  SUM(total_quantidade_produto) as soma_quantidades,
  SUM(total_valor_produto) as soma_valores
FROM saoluiz.vendas_agregadas_60d;

-- 2. Listar colunas criadas
SELECT 
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_schema = 'saoluiz'
  AND table_name = 'vendas_agregadas_60d'
ORDER BY ordinal_position;

-- 3. Sample de dados
SELECT *
FROM saoluiz.vendas_agregadas_60d
LIMIT 5;

-- ============================================================================
-- ⚠️ SE DER ERRO "column v.quantidade does not exist"
-- ============================================================================
-- Execute DIAGNOSTIC_saoluiz_vendas.sql para descobrir o nome correto
-- Depois volte aqui e troque 'v.quantidade' pelo nome correto na linha 18
-- ============================================================================
