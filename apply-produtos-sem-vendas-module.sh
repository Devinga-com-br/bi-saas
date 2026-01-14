#!/bin/bash

# Script para aplicar migration que adiciona módulo 'relatorios_produtos_sem_vendas' ao enum

echo "🔧 Aplicando migration: Add relatorios_produtos_sem_vendas to system_module enum"
echo ""

# Verificar se arquivo de migration existe
MIGRATION_FILE="supabase/migrations/20260114_add_produtos_sem_vendas_module.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Arquivo de migration não encontrado: $MIGRATION_FILE"
  exit 1
fi

echo "📄 Arquivo de migration encontrado: $MIGRATION_FILE"
echo ""
echo "📋 INSTRUÇÕES:"
echo ""
echo "1. Acesse o Supabase Dashboard: https://supabase.com/dashboard"
echo "2. Selecione o projeto"
echo "3. Vá em: SQL Editor → New Query"
echo "4. Cole o conteúdo abaixo:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat "$MIGRATION_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "5. Execute a query (botão RUN ou Ctrl/Cmd + Enter)"
echo "6. Verifique se apareceu: 'Success. No rows returned'"
echo ""
echo "✅ Após executar, o módulo 'Produtos sem Vendas' estará disponível!"
echo ""
