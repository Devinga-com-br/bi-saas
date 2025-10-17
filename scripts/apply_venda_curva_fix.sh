#!/bin/bash

# Script para aplicar a correção da função get_relatorio_venda_curva

echo "Aplicando correção da função get_relatorio_venda_curva..."

# Execute este arquivo SQL no Supabase SQL Editor ou via psql
cat ../supabase/migrations/047_create_venda_curva_report_function.sql

echo ""
echo "===================================="
echo "INSTRUÇÕES:"
echo "1. Copie o conteúdo acima"
echo "2. Acesse o Supabase Dashboard > SQL Editor"
echo "3. Cole e execute o SQL"
echo "===================================="
