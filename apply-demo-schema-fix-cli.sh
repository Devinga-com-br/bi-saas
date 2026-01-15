#!/bin/bash

# Script alternativo usando Supabase CLI
# Aplica a migration 20260115_add_demo_schema_lucro_margem.sql

set -e

echo "=========================================="
echo "Aplicando Fix: Schema Demo - Lucro/Margem"
echo "=========================================="
echo ""

MIGRATION_FILE="supabase/migrations/20260115_add_demo_schema_lucro_margem.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ ERRO: Arquivo de migration não encontrado: $MIGRATION_FILE"
    exit 1
fi

echo "📄 Migration: $MIGRATION_FILE"
echo ""

# Verificar se supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo "❌ ERRO: Supabase CLI não está instalado"
    echo ""
    echo "Instale com:"
    echo "brew install supabase/tap/supabase"
    exit 1
fi

echo "Aplicando migration via Supabase CLI..."
echo ""

# Aplicar migration via supabase db push
supabase db push

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ Migration aplicada com sucesso!"
    echo "=========================================="
else
    echo ""
    echo "❌ ERRO ao aplicar migration"
    exit 1
fi
