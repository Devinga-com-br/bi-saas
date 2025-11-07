#!/bin/bash

# Script para aplicar fix da função get_metas_setor_report_optimized
# Corrige referência a tabela departments_level_N

echo "🔧 Aplicando fix da função get_metas_setor_report_optimized..."

# Aplicar no banco de produção via Supabase
npx supabase db push --db-url "$(grep SUPABASE_DB_URL .env.local | cut -d '=' -f2-)"

if [ $? -eq 0 ]; then
  echo "✅ Fix aplicado com sucesso no banco de produção!"
  echo ""
  echo "Alterações:"
  echo "- Função get_metas_setor_report_optimized corrigida"
  echo "- Agora usa corretamente departments_level_1, departments_level_2, etc"
  echo "- Schema é respeitado (saoluiz, caxias, etc)"
else
  echo "❌ Erro ao aplicar fix"
  echo ""
  echo "Para aplicar manualmente, execute o SQL em:"
  echo "supabase/migrations/20251106000003_fix_metas_setor_departments_table.sql"
fi
