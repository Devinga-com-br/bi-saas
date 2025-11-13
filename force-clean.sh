#!/bin/bash
# Script para forçar limpeza total do cache

echo "🧹 Limpando cache do Next.js..."
rm -rf .next

echo "🧹 Limpando cache do Turbopack..."
rm -rf .turbo

echo "🧹 Limpando node_modules/.cache..."
rm -rf node_modules/.cache

echo "✅ Limpeza completa!"
echo ""
echo "Agora execute: npm run dev"
