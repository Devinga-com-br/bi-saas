#!/bin/bash

# ============================================================================
# SCRIPT: Backup e Análise Completa - Metas Mensais
# ============================================================================
# Cria backup das funções atuais antes de qualquer alteração
# ============================================================================

set -e

BACKUP_DIR="backup_funcoes_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "=========================================="
echo "BACKUP E ANÁLISE - Funções Metas Mensais"
echo "=========================================="
echo ""
echo "📁 Diretório de backup: $BACKUP_DIR"
echo ""

# Verificar se SUPABASE_DB_URL está configurada
if [ -z "$SUPABASE_DB_URL" ]; then
    echo "❌ ERRO: Variável SUPABASE_DB_URL não configurada"
    echo ""
    echo "Configure com:"
    echo "export SUPABASE_DB_URL='postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres'"
    echo ""
    echo "Ou execute os comandos SQL manualmente no Supabase Dashboard"
    exit 1
fi

echo "✅ Conexão configurada"
echo ""

# ============================================================================
# 1. ESTRUTURA DA TABELA metas_mensais
# ============================================================================

echo "📊 1. Extraindo estrutura da tabela metas_mensais..."

psql "$SUPABASE_DB_URL" -c "
SELECT 
    table_schema,
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'metas_mensais'
  AND table_schema IN ('demo', 'okilao', 'saoluiz', 'paraiso', 'lucia', 'sol')
ORDER BY table_schema, ordinal_position;
" > "$BACKUP_DIR/01_estrutura_tabela.txt"

echo "   ✓ Salvo em: $BACKUP_DIR/01_estrutura_tabela.txt"

# ============================================================================
# 2. FUNÇÃO: atualizar_valores_realizados_metas
# ============================================================================

echo "📝 2. Extraindo função: atualizar_valores_realizados_metas..."

psql "$SUPABASE_DB_URL" -t -c "
SELECT pg_get_functiondef(p.oid)
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'atualizar_valores_realizados_metas'
  AND n.nspname = 'public';
" > "$BACKUP_DIR/02_atualizar_valores_realizados_metas.sql"

echo "   ✓ Salvo em: $BACKUP_DIR/02_atualizar_valores_realizados_metas.sql"

# ============================================================================
# 3. FUNÇÃO: get_metas_mensais_report
# ============================================================================

echo "📝 3. Extraindo função: get_metas_mensais_report..."

psql "$SUPABASE_DB_URL" -t -c "
SELECT pg_get_functiondef(p.oid)
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'get_metas_mensais_report'
  AND n.nspname = 'public';
" > "$BACKUP_DIR/03_get_metas_mensais_report.sql"

echo "   ✓ Salvo em: $BACKUP_DIR/03_get_metas_mensais_report.sql"

# ============================================================================
# 4. FUNÇÃO: update_meta_mensal
# ============================================================================

echo "📝 4. Extraindo função: update_meta_mensal..."

psql "$SUPABASE_DB_URL" -t -c "
SELECT pg_get_functiondef(p.oid)
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'update_meta_mensal'
  AND n.nspname = 'public';
" > "$BACKUP_DIR/04_update_meta_mensal.sql"

echo "   ✓ Salvo em: $BACKUP_DIR/04_update_meta_mensal.sql"

# ============================================================================
# 5. TODAS AS FUNÇÕES RELACIONADAS A METAS
# ============================================================================

echo "📋 5. Listando todas as funções relacionadas a metas..."

psql "$SUPABASE_DB_URL" -c "
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE (p.proname LIKE '%meta%' OR p.proname LIKE '%Meta%')
  AND n.nspname = 'public'
ORDER BY p.proname;
" > "$BACKUP_DIR/05_lista_funcoes_metas.txt"

echo "   ✓ Salvo em: $BACKUP_DIR/05_lista_funcoes_metas.txt"

# ============================================================================
# 6. VERIFICAR SCHEMAS
# ============================================================================

echo "🔍 6. Verificando schemas existentes..."

psql "$SUPABASE_DB_URL" -c "
SELECT 
    schemaname,
    tablename
FROM pg_tables
WHERE tablename = 'metas_mensais'
ORDER BY schemaname;
" > "$BACKUP_DIR/06_schemas_com_metas_mensais.txt"

echo "   ✓ Salvo em: $BACKUP_DIR/06_schemas_com_metas_mensais.txt"

# ============================================================================
# 7. RESUMO FINAL
# ============================================================================

echo ""
echo "=========================================="
echo "✅ BACKUP CONCLUÍDO COM SUCESSO!"
echo "=========================================="
echo ""
echo "📁 Todos os arquivos salvos em: $BACKUP_DIR"
echo ""
echo "📋 Arquivos criados:"
ls -lh "$BACKUP_DIR"
echo ""
echo "🔍 PRÓXIMOS PASSOS:"
echo ""
echo "1. Revise os arquivos em $BACKUP_DIR"
echo "2. Verifique especialmente:"
echo "   - 01_estrutura_tabela.txt (quais schemas TEM as colunas)"
echo "   - 02_atualizar_valores_realizados_metas.sql (função atual)"
echo "   - 03_get_metas_mensais_report.sql (função atual)"
echo ""
echo "3. Se tudo OK, execute a migration:"
echo "   psql \"\$SUPABASE_DB_URL\" -f FIX_DEMO_SCHEMA_MANUAL.sql"
echo ""
echo "4. Em caso de erro, restaure com:"
echo "   psql \"\$SUPABASE_DB_URL\" -f $BACKUP_DIR/02_*.sql"
echo "   psql \"\$SUPABASE_DB_URL\" -f $BACKUP_DIR/03_*.sql"
echo ""
