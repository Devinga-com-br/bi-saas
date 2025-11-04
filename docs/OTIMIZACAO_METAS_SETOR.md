# Otimizações do Módulo de Metas por Setor

## Problema Identificado

O relatório de metas por setor estava apresentando timeouts frequentes com o erro:
```
canceling statement due to statement timeout
```

### Causa Raiz
1. **API ineficiente**: Fazia uma chamada RPC separada para cada filial
2. **Índices inadequados**: Faltavam índices otimizados para a query específica
3. **Query ineficiente**: Usava `EXTRACT(MONTH/YEAR)` sem índices funcionais

## Soluções Implementadas

### 1. Correção da UI - MultiSelect Component
**Arquivo**: `src/components/ui/multi-select.tsx`

**Problema**: Badges das filiais estouravam o campo quando todas eram selecionadas

**Solução**:
- Adicionado `max-h-24 overflow-y-auto` ao container
- Campo agora tem scroll interno quando necessário
- Removida altura fixa do campo no page.tsx

### 2. Otimização da API
**Arquivo**: `src/app/api/metas/setor/report/route.ts`

**Antes**:
```typescript
// Chamava RPC para CADA filial individualmente
finalFilialIds.map(async (filialId) => {
  await supabase.rpc('get_metas_setor_report', {
    p_filial_id: filialId
  })
})
```

**Depois**:
```typescript
// UMA única chamada para todas as filiais
await supabase.rpc('get_metas_setor_report_optimized', {
  p_filial_ids: finalFilialIds // Array de IDs
})
```

**Benefícios**:
- Redução de N chamadas para 1 chamada
- Menor overhead de rede
- Transação única no banco

### 3. Nova Função RPC Otimizada
**Arquivo**: `OPTIMIZE_METAS_SETOR_REPORT.sql`

**Melhorias**:

#### a) Índices Compostos
```sql
-- Índice específico para a query de report
CREATE INDEX idx_metas_setor_report_query
ON metas_setor(setor_id, data, filial_id)
WHERE setor_id IS NOT NULL;

-- Índice funcional para EXTRACT
CREATE INDEX idx_metas_setor_month_year
ON metas_setor((EXTRACT(MONTH FROM data)), (EXTRACT(YEAR FROM data)), setor_id);
```

#### b) Função Otimizada
```sql
CREATE OR REPLACE FUNCTION get_metas_setor_report_optimized(
  p_schema TEXT,
  p_setor_id BIGINT,
  p_mes INT,
  p_ano INT,
  p_filial_ids BIGINT[] DEFAULT NULL  -- Aceita array!
)
```

**Otimizações**:
- Usa range de datas (`>= date_start AND <= date_end`) em vez de `EXTRACT()`
- Suporta array de filiais com `ANY()`
- Timeout configurado em 30s
- Tratamento de exceções com fallback

#### c) Análise de Tabelas
```sql
ANALYZE metas_setor;
```
Atualiza estatísticas do query planner para escolher planos de execução melhores

## Como Aplicar as Otimizações

### Passo 1: Executar no Supabase SQL Editor
```sql
-- Cole e execute o conteúdo de OPTIMIZE_METAS_SETOR_REPORT.sql
```

### Passo 2: Verificar Criação dos Índices
```sql
-- Verificar índices criados
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'metas_setor'
ORDER BY schemaname, indexname;
```

### Passo 3: Testar a Nova Função
```sql
-- Testar com múltiplas filiais
SELECT get_metas_setor_report_optimized(
  'seu_schema',
  1,  -- setor_id
  11, -- mês
  2025, -- ano
  ARRAY[1, 4, 6, 7, 9]::BIGINT[] -- filiais
);
```

## Métricas de Performance Esperadas

### Antes
- **Tempo médio**: 9-10 segundos (com timeouts frequentes)
- **Chamadas RPC**: 5-10 (uma por filial)
- **Taxa de timeout**: ~40-50%

### Depois (Esperado)
- **Tempo médio**: 1-3 segundos
- **Chamadas RPC**: 1 única
- **Taxa de timeout**: <5%

## Compatibilidade

A implementação é **backward compatible**:
- Se a função otimizada não existir, faz fallback para função antiga
- Se a função antiga falhar, retorna array vazio
- Logs detalhados para debugging

## Monitoramento

Verifique os logs da API:
```
[API/METAS/SETOR/REPORT] Using optimized function
[API/METAS/SETOR/REPORT] Success, dates: 30 total filials: 150
```

Se ainda houver problemas:
```
[API/METAS/SETOR/REPORT] Optimized function not available, using fallback
```
→ Significa que a função otimizada não foi criada no banco

## Próximos Passos (Se Ainda Houver Timeouts)

1. **Particionar a tabela metas_setor** por mês/ano
2. **Adicionar cache** (Redis) para consultas repetidas
3. **Pré-calcular** agregações em uma tabela materializada
4. **Usar Connection Pooling** (PgBouncer)

## Arquivos Modificados

- ✅ `src/components/ui/multi-select.tsx` - Fix UI overflow
- ✅ `src/app/(dashboard)/metas/setor/page.tsx` - Remove altura fixa
- ✅ `src/app/api/metas/setor/report/route.ts` - Otimização da API
- ✅ `OPTIMIZE_METAS_SETOR_REPORT.sql` - Script de otimização do banco
