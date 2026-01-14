#!/bin/bash

# Script para aplicar migration de hierarquia no DRE Comparativo

echo "🔧 Aplicando migration: Add hierarchical despesas to DRE Comparativo"
echo ""

MIGRATION_FILE="supabase/migrations/20260114_add_hierarchical_despesas_dre_comparativo.sql"

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
echo "4. Cole o SQL do arquivo (muito grande para mostrar aqui)"
echo "5. Execute a query (botão RUN ou Ctrl/Cmd + Enter)"
echo "6. Aguarde a confirmação de sucesso"
echo ""
echo "✅ O que será criado:"
echo "   • get_dre_comparativo_data_v3() - versão com hierarquia completa"
echo "   • get_dre_comparativo_data_v2_v3() - versão com datas + hierarquia"
echo "   • Funções antigas redirecionam para novas versões (compatibilidade)"
echo ""
echo "📊 Nova estrutura de despesas_json:"
echo "   Departamento → Tipo → Despesa (com nota, data, valor)"
echo ""
echo "⚠️  IMPORTANTE: Esta migration não quebra código existente!"
echo ""
echo "Deseja ver o SQL? (s/N)"
read -r response
if [[ "$response" =~ ^[Ss]$ ]]; then
  cat "$MIGRATION_FILE"
fi
