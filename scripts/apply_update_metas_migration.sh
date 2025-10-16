#!/bin/bash

# Script para aplicar a migration de atualização de valores realizados
# Use este script para aplicar a função no banco de dados

echo "================================================"
echo "MIGRATION: Atualizar Valores Realizados Metas"
echo "================================================"
echo ""
echo "Esta migration cria a função 'atualizar_valores_realizados_metas'"
echo "que recalcula o valor_realizado nas metas mensais."
echo ""
echo "Para aplicar, execute o SQL abaixo no Supabase SQL Editor:"
echo ""
echo "---"
cat supabase/migrations/999_atualizar_valores_realizados_metas.sql
echo "---"
echo ""
echo "Ou aplique via Supabase CLI:"
echo "  supabase db push"
echo ""
echo "================================================"
