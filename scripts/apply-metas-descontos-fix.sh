#!/bin/bash

# ====================================================
# Script de Aplicação: Correção Metas e Descontos
# ====================================================
# Aplica todas as migrations necessárias via Supabase CLI
# ====================================================

set -e  # Parar em caso de erro

echo "🚀 Aplicando correções: Metas Mensais + Descontos Venda"
echo ""

# Verificar se Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI não encontrado!"
    echo "   Instale com: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI encontrado"
echo ""

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Execute este script na raiz do projeto"
    exit 1
fi

echo "📂 Diretório correto"
echo ""

# Listar migrations que serão aplicadas
echo "📋 Migrations a serem aplicadas:"
echo "   1. 20251106000000_add_descontos_venda_functions.sql"
echo "   2. 20251106000001_create_descontos_venda_table.sql"
echo "   3. 20251106000002_fix_metas_and_descontos.sql"
echo ""

# Perguntar confirmação
read -p "Deseja continuar? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Operação cancelada"
    exit 1
fi

# Aplicar migrations
echo ""
echo "📤 Aplicando migrations..."
echo ""

supabase db push

echo ""
echo "✅ Migrations aplicadas com sucesso!"
echo ""

# Lembrete sobre Exposed Schemas
echo "⚠️  IMPORTANTE: Lembre-se de adicionar os schemas aos Exposed Schemas:"
echo ""
echo "   1. Acesse Supabase Dashboard"
echo "   2. Settings → API → Exposed schemas"
echo "   3. Adicione: saoluiz, okilao, paraiso, lucia"
echo ""
echo "   Sem isso, você verá erro: PGRST106"
echo ""

# Lembrete sobre testes
echo "🧪 Próximos passos:"
echo ""
echo "   1. Testar Metas Mensais:"
echo "      - Verificar filtro multi-filial"
echo "      - Verificar cálculo até D-1 no mês atual"
echo ""
echo "   2. Testar Descontos Venda:"
echo "      - Lançar desconto com desconto_custo"
echo "      - Verificar coluna na listagem"
echo ""
echo "   3. Verificar Exposed Schemas"
echo ""

echo "✅ Processo concluído!"
echo ""
echo "📚 Documentação: MULTI_FILIAL_AND_DESCONTOS_FIX.md"
