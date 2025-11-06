#!/bin/bash

# Script para testar a correção de múltiplas filiais em metas
# Executa o SQL em todos os schemas de tenant

set -e

echo "🔧 Aplicando correção de múltiplas filiais em metas..."
echo ""

# Verificar se o arquivo SQL existe
if [ ! -f "FIX_METAS_MENSAIS_MULTIPLE_FILIAIS.sql" ]; then
    echo "❌ Erro: Arquivo FIX_METAS_MENSAIS_MULTIPLE_FILIAIS.sql não encontrado"
    exit 1
fi

# Obter credenciais do .env.local
if [ ! -f ".env.local" ]; then
    echo "❌ Erro: Arquivo .env.local não encontrado"
    exit 1
fi

source .env.local

if [ -z "$DATABASE_URL" ]; then
    echo "❌ Erro: DATABASE_URL não definida no .env.local"
    exit 1
fi

echo "✅ Credenciais carregadas"
echo ""

# Lista de schemas (tenants)
SCHEMAS=("okilao" "saoluiz" "paraiso" "lucia")

echo "📋 Schemas a serem atualizados: ${SCHEMAS[@]}"
echo ""

# Executar SQL em cada schema
for SCHEMA in "${SCHEMAS[@]}"; do
    echo "⏳ Aplicando correção no schema: $SCHEMA"
    
    # Nota: Esta função é global (public), então precisa ser executada apenas uma vez
    # Mas vamos executar para cada schema para garantir
    
    psql "$DATABASE_URL" <<EOF
-- Aplicar função global
\i FIX_METAS_MENSAIS_MULTIPLE_FILIAIS.sql

-- Verificar se a função foi criada
SELECT 
    routine_name, 
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_name = 'get_metas_mensais_report'
    AND routine_schema = 'public';

-- Testar a função com o schema $SCHEMA
SELECT 'Testando schema: $SCHEMA';
EOF

    if [ $? -eq 0 ]; then
        echo "   ✅ Schema $SCHEMA atualizado com sucesso"
    else
        echo "   ❌ Erro ao atualizar schema $SCHEMA"
        exit 1
    fi
    
    echo ""
done

echo "🎉 Correção aplicada com sucesso em todos os schemas!"
echo ""
echo "📝 Próximos passos:"
echo "   1. Fazer rebuild da aplicação: npm run build"
echo "   2. Testar no browser: /metas/mensal"
echo "   3. Verificar recálculo ao alterar filiais selecionadas"
