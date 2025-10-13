#!/bin/bash

# Script para limpar cache do Next.js/Turbopack
# Útil quando há erros de build ou hot reload

echo "🧹 Limpando cache do Next.js..."

# Remover diretório .next
if [ -d ".next" ]; then
  rm -rf .next
  echo "✅ .next removido"
else
  echo "ℹ️  .next não existe"
fi

# Remover cache do node_modules
if [ -d "node_modules/.cache" ]; then
  rm -rf node_modules/.cache
  echo "✅ node_modules/.cache removido"
else
  echo "ℹ️  node_modules/.cache não existe"
fi

echo ""
echo "🎉 Cache limpo com sucesso!"
echo ""
echo "Para reiniciar o servidor:"
echo "  npm run dev"
