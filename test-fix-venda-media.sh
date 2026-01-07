#!/bin/bash
# ============================================================================
# Script: Testar correção da função calcular_venda_media_diaria_60d
# ============================================================================
# Data: 2026-01-07
# Uso: ./test-fix-venda-media.sh
# ============================================================================

set -e

echo "=========================================="
echo "🔍 Teste: Correção venda_media_diaria_60d"
echo "=========================================="
echo ""

# Conectar ao Supabase (ajuste as variáveis conforme necessário)
PGHOST="${SUPABASE_DB_HOST:-db.YOUR_PROJECT.supabase.co}"
PGPORT="${SUPABASE_DB_PORT:-5432}"
PGDATABASE="${SUPABASE_DB_NAME:-postgres}"
PGUSER="${SUPABASE_DB_USER:-postgres}"

echo "📌 Conectando ao banco: $PGHOST:$PGPORT/$PGDATABASE"
echo ""

# ============================================================================
# PASSO 1: Verificar colunas da MV saoluiz
# ============================================================================
echo "🔎 PASSO 1: Verificando estrutura da MV vendas_agregadas_60d (schema: saoluiz)"
echo ""

psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns
WHERE table_schema = 'saoluiz'
  AND table_name = 'vendas_agregadas_60d'
ORDER BY ordinal_position;
"

echo ""
echo "✅ Se você NÃO vê a coluna 'total_quantidade_produto', execute a migration:"
echo "   supabase/migrations/20260107_recreate_saoluiz_mv_60d.sql"
echo ""
read -p "Pressione ENTER para continuar..."

# ============================================================================
# PASSO 2: Executar migration de correção da função
# ============================================================================
echo ""
echo "🔧 PASSO 2: Aplicando correção da função calcular_venda_media_diaria_60d"
echo ""

psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
  -f supabase/migrations/20260107_fix_calcular_venda_media_diaria_60d.sql

echo ""
echo "✅ Função corrigida com sucesso!"
echo ""

# ============================================================================
# PASSO 3: Verificar definição da função
# ============================================================================
echo "🔎 PASSO 3: Verificando código da função atualizada"
echo ""

psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "
SELECT 
  pg_get_functiondef('public.calcular_venda_media_diaria_60d'::regprocedure);
" | grep -A 3 "total_quantidade_produto" || echo "⚠️  Código não encontrado"

echo ""

# ============================================================================
# PASSO 4: Testar a função
# ============================================================================
echo "🧪 PASSO 4: Testando função para schema saoluiz"
echo ""

psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "
SELECT public.calcular_venda_media_diaria_60d('saoluiz');
"

echo ""

# ============================================================================
# PASSO 5: Verificar resultados
# ============================================================================
echo "📊 PASSO 5: Verificando produtos atualizados (sample de 10)"
echo ""

psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "
SELECT 
  id,
  descricao,
  venda_media_diaria_60d,
  estoque_atual,
  CASE 
    WHEN venda_media_diaria_60d > 0 
    THEN ROUND(estoque_atual / venda_media_diaria_60d, 1)
    ELSE NULL 
  END as dias_de_estoque
FROM saoluiz.produtos
WHERE venda_media_diaria_60d IS NOT NULL
  AND venda_media_diaria_60d > 0
ORDER BY venda_media_diaria_60d DESC
LIMIT 10;
"

echo ""
echo "=========================================="
echo "✅ Teste concluído!"
echo "=========================================="
echo ""
echo "📝 Próximos passos:"
echo "  1. Verifique se há valores em venda_media_diaria_60d"
echo "  2. Execute para outros schemas (okilao, lucia, etc):"
echo "     SELECT public.calcular_venda_media_diaria_60d('NOME_SCHEMA');"
echo ""
