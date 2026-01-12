#!/bin/bash

# Apply produtos-sem-vendas function fix
# Run this script after setting your Supabase connection details

echo "Applying produtos-sem-vendas function fix..."
echo ""
echo "Please run this SQL in your Supabase SQL Editor:"
echo "File: supabase/migrations/20260110_create_produtos_sem_vendas_function.sql"
echo ""
cat supabase/migrations/20260110_create_produtos_sem_vendas_function.sql
