#!/bin/bash

# =====================================================
# Script de Otimização - Produtos Sem Vendas
# =====================================================

echo "🚀 Otimização de Performance - Produtos Sem Vendas"
echo ""
echo "Este script irá mostrar os comandos SQL necessários para"
echo "otimizar a função get_produtos_sem_vendas e criar índices."
echo ""
echo "⚠️  IMPORTANTE: Execute no Supabase SQL Editor"
echo ""
echo "═══════════════════════════════════════════════════════"
echo ""

# Schemas disponíveis
SCHEMAS=("saoluiz" "okilao" "paraiso" "lucia")

echo "📋 PASSO 1: Atualizar a Função RPC"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Cole o seguinte arquivo no Supabase SQL Editor:"
echo "Arquivo: supabase/migrations/20260111_optimize_produtos_sem_vendas.sql"
echo ""
echo "Pressione ENTER para ver o conteúdo..."
read

cat supabase/migrations/20260111_optimize_produtos_sem_vendas.sql

echo ""
echo ""
echo "📋 PASSO 2: Criar Índices por Schema"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Para cada schema, execute os comandos abaixo:"
echo ""

for schema in "${SCHEMAS[@]}"; do
  echo "-- =========================================="
  echo "-- SCHEMA: $schema"
  echo "-- =========================================="
  echo ""
  
  echo "-- Índice: Produtos sem vendas (filial + ativo + estoque)"
  echo "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_${schema}_produtos_sem_vendas"
  echo "  ON ${schema}.produtos (filial_id, ativo, estoque_atual)"
  echo "  WHERE ativo = true AND estoque_atual > 0;"
  echo ""
  
  echo "-- Índice: Produtos por curva ABC"
  echo "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_${schema}_produtos_curva"
  echo "  ON ${schema}.produtos (curva_abcd, filial_id)"
  echo "  WHERE ativo = true;"
  echo ""
  
  echo "-- Índice: Última venda histórica"
  echo "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_${schema}_vendas_ultima"
  echo "  ON ${schema}.vendas (id_produto, filial_id, data_venda DESC);"
  echo ""
  
  echo "-- Índice: Última venda hoje"
  echo "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_${schema}_vendas_hoje_ultima"
  echo "  ON ${schema}.vendas_hoje_itens (produto_id, filial_id, data_extracao DESC)"
  echo "  WHERE cancelado = false;"
  echo ""
  echo ""
done

echo ""
echo "📋 PASSO 3: Verificar Índices Criados"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Execute para verificar:"
echo ""

for schema in "${SCHEMAS[@]}"; do
  echo "-- Schema: $schema"
  echo "SELECT indexname, indexdef"
  echo "FROM pg_indexes"
  echo "WHERE schemaname = '$schema'"
  echo "  AND tablename IN ('produtos', 'vendas', 'vendas_hoje_itens')"
  echo "  AND indexname LIKE 'idx_${schema}%';"
  echo ""
done

echo ""
echo "📋 PASSO 4: Testar Performance"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "1. Acesse: http://localhost:3000/relatorios/produtos-sem-vendas"
echo "2. Selecione UMA filial"
echo "3. Clique em 'Buscar'"
echo "4. Verifique tempo de resposta (deve ser < 2s)"
echo "5. Teste com 'Todas as filiais' (deve ser < 5s)"
echo ""

echo "✅ Documentação completa em: docs/PRODUTOS_SEM_VENDAS_OPTIMIZATION.md"
echo ""
