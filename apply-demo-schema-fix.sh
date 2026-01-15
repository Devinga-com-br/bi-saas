#!/bin/bash

# Script para aplicar fix de colunas faltantes no schema demo
# Aplica a migration 20260115_add_demo_schema_lucro_margem.sql

set -e

echo "=========================================="
echo "Aplicando Fix: Schema Demo - Lucro/Margem"
echo "=========================================="
echo ""

# Verificar se SUPABASE_DB_URL está configurada
if [ -z "$SUPABASE_DB_URL" ]; then
    echo "❌ ERRO: Variável SUPABASE_DB_URL não configurada"
    echo ""
    echo "Configure com:"
    echo "export SUPABASE_DB_URL='postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres'"
    exit 1
fi

MIGRATION_FILE="supabase/migrations/20260115_add_demo_schema_lucro_margem.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ ERRO: Arquivo de migration não encontrado: $MIGRATION_FILE"
    exit 1
fi

echo "📄 Migration: $MIGRATION_FILE"
echo ""
echo "Executando..."
echo ""

# Aplicar migration
psql "$SUPABASE_DB_URL" -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ Migration aplicada com sucesso!"
    echo "=========================================="
    echo ""
    echo "Próximos passos:"
    echo "1. Reinicie o servidor: npm run dev"
    echo "2. Acesse /metas/mensal"
    echo "3. Gere uma meta novamente"
else
    echo ""
    echo "❌ ERRO ao aplicar migration"
    exit 1
fi
