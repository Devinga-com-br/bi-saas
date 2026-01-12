# 🚨 FIX TIMEOUT - AÇÃO IMEDIATA

## Situação
Query ainda está com timeout mesmo com paginação. Causa: **falta de índices**.

## Solução em 2 Passos

### ✅ PASSO 1: Função Ultra Otimizada (AGORA)

Execute no Supabase SQL Editor:

**Arquivo:** `DEPLOY_ULTRA_OPTIMIZED.sql`

Esta versão:
- ✅ Limita produtos base em 2.000 (em vez de 10.000)
- ✅ Ignora `vendas_hoje_itens` temporariamente (reduz joins)
- ✅ Timeout configurado para 25s
- ✅ Mensagem de erro mais clara
- ✅ Funciona MESMO sem índices

### ✅ PASSO 2: Criar Índices (Paralelamente)

Execute no Supabase SQL Editor:

**Arquivo:** `CREATE_INDEXES_SAOLUIZ.sql`

⚠️ **IMPORTANTE:**
- Use `CONCURRENTLY` - não bloqueia tabela
- Pode demorar 5-10 minutos
- Execute em outra aba enquanto testa

## Testar

1. Execute `DEPLOY_ULTRA_OPTIMIZED.sql`
2. Recarregue página do relatório
3. **SELECIONE UMA FILIAL ESPECÍFICA** (não "Todas")
4. Clique em "Buscar"
5. Deve carregar em < 5 segundos

## Performance Esperada

| Cenário | Sem Índices | Com Índices |
|---------|-------------|-------------|
| 1 Filial | 5-8s | < 2s |
| Todas Filiais | 15-20s | 3-5s |

## Se ainda der timeout

1. Verifique no Supabase:
   - Settings → Database → Query Performance
   - Veja qual query está demorando

2. Crie os índices:
   - Execute `CREATE_INDEXES_SAOLUIZ.sql`
   - Aguarde conclusão (5-10 min)
   - Teste novamente

3. Alternativa temporária:
   - Use SOMENTE filtro de 1 filial
   - Aguarde índices serem criados
   - Depois pode usar "Todas as filiais"

## Monitorar Criação de Índices

```sql
-- Ver progresso dos índices CONCURRENTLY
SELECT 
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'saoluiz'
  AND indexname LIKE 'idx_saoluiz%';
```

## Checklist

- [ ] Executar DEPLOY_ULTRA_OPTIMIZED.sql
- [ ] Testar com 1 filial
- [ ] Executar CREATE_INDEXES_SAOLUIZ.sql (em paralelo)
- [ ] Aguardar criação dos índices (5-10 min)
- [ ] Testar novamente
- [ ] Repetir índices para outros schemas (okilao, paraiso, lucia)
