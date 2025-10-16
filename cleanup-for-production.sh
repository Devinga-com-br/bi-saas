#!/bin/bash
# Script para mover arquivos desnecessários para .archive antes do deploy

ARCHIVE_DIR=".archive"

echo "📦 Movendo arquivos de desenvolvimento para $ARCHIVE_DIR..."

# Scripts de Debug/Testes SQL
mv debug_*.sql "$ARCHIVE_DIR/" 2>/dev/null
mv TESTE_*.sql "$ARCHIVE_DIR/" 2>/dev/null
mv VERIFICAR_*.sql "$ARCHIVE_DIR/" 2>/dev/null
mv verificar_*.sql "$ARCHIVE_DIR/" 2>/dev/null
mv PROVA_REAL_META.sql "$ARCHIVE_DIR/" 2>/dev/null
mv DIAGNOSTICO_E_FIX_SETORES.sql "$ARCHIVE_DIR/" 2>/dev/null

# Scripts de Fix/Migrations
mv FIX_*.sql "$ARCHIVE_DIR/" 2>/dev/null
mv fix_*.sql "$ARCHIVE_DIR/" 2>/dev/null
mv APPLY_MIGRATION_032.sql "$ARCHIVE_DIR/" 2>/dev/null
mv EXECUTE_NO_SUPABASE.sql "$ARCHIVE_DIR/" 2>/dev/null
mv SOLUCAO_*.sql "$ARCHIVE_DIR/" 2>/dev/null

# Scripts de Exemplo
mv CRIAR_SETORES_EXEMPLO.sql "$ARCHIVE_DIR/" 2>/dev/null
mv CLONAR_SCHEMA_TENANT.sql "$ARCHIVE_DIR/" 2>/dev/null

# Documentação de Desenvolvimento
mv ARQUITETURA_CRIACAO_USUARIO.md "$ARCHIVE_DIR/" 2>/dev/null
mv *_UPDATE.md "$ARCHIVE_DIR/" 2>/dev/null
mv FIX_*.md "$ARCHIVE_DIR/" 2>/dev/null
mv METAS_*_SUMMARY.md "$ARCHIVE_DIR/" 2>/dev/null
mv METAS_*_INSTRUCTIONS.md "$ARCHIVE_DIR/" 2>/dev/null
mv METAS_MODULE_*.md "$ARCHIVE_DIR/" 2>/dev/null
mv QUICKSTART_METAS.md "$ARCHIVE_DIR/" 2>/dev/null
mv PROJECT_STATUS.md "$ARCHIVE_DIR/" 2>/dev/null
mv TROUBLESHOOTING.md "$ARCHIVE_DIR/" 2>/dev/null
mv *_GUIDE.md "$ARCHIVE_DIR/" 2>/dev/null
mv CLAUDE.md "$ARCHIVE_DIR/" 2>/dev/null
mv GEMINI.md "$ARCHIVE_DIR/" 2>/dev/null
mv LAYOUT_STRUCTURE.md "$ARCHIVE_DIR/" 2>/dev/null
mv REDESIGN_SUMMARY.md "$ARCHIVE_DIR/" 2>/dev/null
mv RUPTURA_ABCD_REPORT.md "$ARCHIVE_DIR/" 2>/dev/null
mv TENANT_BUG_FIX.md "$ARCHIVE_DIR/" 2>/dev/null
mv UX_IMPROVEMENTS.md "$ARCHIVE_DIR/" 2>/dev/null
mv COMO_FUNCIONA_META_SETOR.md "$ARCHIVE_DIR/" 2>/dev/null
mv DATABASE_CONTEXT.md "$ARCHIVE_DIR/" 2>/dev/null
mv SOLUCAO_COMPLETA_METAS_SETOR.md "$ARCHIVE_DIR/" 2>/dev/null

echo "✅ Arquivos movidos para $ARCHIVE_DIR"
echo ""
echo "📋 Arquivos mantidos na raiz:"
ls -1 *.md 2>/dev/null
echo ""
echo "🔧 Para reverter, mova os arquivos de volta: mv .archive/* ."
