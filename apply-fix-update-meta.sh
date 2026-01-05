#!/bin/bash

# Script para aplicar a migration fix_update_meta_mensal em todos os schemas
# Este script corrige a função update_meta_mensal para usar INTEGER ao invés de UUID

echo "🔧 Aplicando correção da função update_meta_mensal..."

# Ler a migration
MIGRATION_SQL=$(cat supabase/migrations/20260105_fix_update_meta_mensal.sql)

# Aplicar no schema public (função é SECURITY DEFINER então vai no public)
echo "📝 Aplicando no schema public..."

# Usar psql para executar
psql "$DATABASE_URL" -c "$MIGRATION_SQL"

if [ $? -eq 0 ]; then
  echo "✅ Migração aplicada com sucesso!"
  echo ""
  echo "📋 Próximos passos:"
  echo "1. Teste a edição de meta no frontend"
  echo "2. Verifique os logs no console"
  echo "3. Confirme que pode zerar metas sem erro"
else
  echo "❌ Erro ao aplicar migração"
  exit 1
fi
