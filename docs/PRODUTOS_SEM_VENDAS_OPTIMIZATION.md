# Otimização de Performance - Produtos Sem Vendas

**Data:** 2026-01-11  
**Problema:** Queries muito pesadas causando timeouts e erros

## Problemas Identificados

1. **Statement Timeout**: Query completa demorava mais de 30 segundos
2. **FULL OUTER JOIN**: Operação custosa desnecessária
3. **Sem Paginação**: Tentava retornar todos os registros de uma vez
4. **Falta de Índices**: Tabelas sem índices apropriados

## Soluções Implementadas

### 1. Reestruturação da Query (20260111_optimize_produtos_sem_vendas.sql)

**Antes:**
```sql
-- FULL OUTER JOIN em todas as vendas
FROM ultimas_vendas_historico vh
FULL OUTER JOIN ultimas_vendas_hoje vhj
```

**Depois:**
```sql
-- LEFT JOIN a partir de produtos filtrados
FROM produtos_filtrados pf
LEFT JOIN vendas v ON ...
LEFT JOIN vendas_hoje_itens vhi ON ...
```

**Benefícios:**
- Filtra produtos PRIMEIRO (reduz dataset drasticamente)
- LEFT JOIN mais eficiente que FULL OUTER JOIN
- Usa GREATEST() para comparar datas em uma única passada

### 2. Paginação Obrigatória

**Parâmetros Novos:**
- `p_limit` (padrão: 500) - Máximo de registros por página
- `p_offset` (padrão: 0) - Deslocamento para paginação

**Limites:**
- Visualização: 100 produtos por página
- Exportação PDF: 10.000 produtos máximo
- Segurança interna: 10.000 produtos na CTE

### 3. Índices Recomendados

Execute para cada schema (saoluiz, okilao, paraiso, lucia):

```sql
-- Produtos: filtragem rápida
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_{schema}_produtos_sem_vendas 
  ON {schema}.produtos (filial_id, ativo, estoque_atual) 
  WHERE ativo = true AND estoque_atual > 0;

-- Produtos: filtro por curva
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_{schema}_produtos_curva 
  ON {schema}.produtos (curva_abcd, filial_id) 
  WHERE ativo = true;

-- Vendas: última venda por produto
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_{schema}_vendas_ultima 
  ON {schema}.vendas (id_produto, filial_id, data_venda DESC);

-- Vendas hoje: última venda do dia
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_{schema}_vendas_hoje_ultima 
  ON {schema}.vendas_hoje_itens (produto_id, filial_id, data_extracao DESC) 
  WHERE cancelado = false;
```

### 4. Alterações na API

**Arquivo:** `src/app/api/relatorios/produtos-sem-vendas/route.ts`

**Novos Parâmetros:**
- `limit` (query param)
- `offset` (query param)

**Resposta Modificada:**
```typescript
{
  data: ProdutoSemVenda[],
  pagination: {
    total: number,
    limit: number,
    offset: number,
    hasMore: boolean
  }
}
```

### 5. Alterações no Frontend

**Arquivo:** `src/app/(dashboard)/relatorios/produtos-sem-vendas/page.tsx`

**Novas Features:**
- Paginação com botões Anterior/Próxima
- Display de "Página X de Y"
- Contador total de produtos
- Exportação busca todos os dados (até 10k)

## Como Aplicar

### 1. Atualizar a Função RPC

Execute no Supabase SQL Editor:

```bash
# Copie o conteúdo de:
supabase/migrations/20260111_optimize_produtos_sem_vendas.sql
```

### 2. Criar Índices (IMPORTANTE!)

Para cada schema, execute:

```sql
-- Exemplo para schema 'saoluiz'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saoluiz_produtos_sem_vendas 
  ON saoluiz.produtos (filial_id, ativo, estoque_atual) 
  WHERE ativo = true AND estoque_atual > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saoluiz_produtos_curva 
  ON saoluiz.produtos (curva_abcd, filial_id) 
  WHERE ativo = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saoluiz_vendas_ultima 
  ON saoluiz.vendas (id_produto, filial_id, data_venda DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saoluiz_vendas_hoje_ultima 
  ON saoluiz.vendas_hoje_itens (produto_id, filial_id, data_extracao DESC) 
  WHERE cancelado = false;
```

⚠️ **CONCURRENTLY**: Cria índices sem bloquear a tabela (pode levar alguns minutos)

### 3. Testar

1. Acesse `/relatorios/produtos-sem-vendas`
2. Selecione UMA filial primeiro (teste mais rápido)
3. Clique em "Buscar"
4. Verifique paginação funcionando
5. Teste com "Todas as filiais"

## Métricas Esperadas

| Cenário | Antes | Depois |
|---------|-------|--------|
| 1 Filial | 5-10s | < 2s |
| Todas Filiais | Timeout (30s+) | 3-5s |
| Registros/página | Todos | 100 |
| Exportação PDF | Timeout | < 10s (até 10k) |

## Monitoramento

Verifique logs da API:

```
[API/PRODUTOS-SEM-VENDAS] Success: {
  count: 100,
  totalCount: 1523,
  offset: 0,
  limit: 100
}
```

## Troubleshooting

### Ainda está lento?

1. **Verifique os índices criados:**
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'saoluiz' 
  AND tablename IN ('produtos', 'vendas', 'vendas_hoje_itens');
```

2. **Analise o plano de execução:**
```sql
EXPLAIN ANALYZE 
SELECT * FROM get_produtos_sem_vendas(
  'saoluiz', 'all', 30, CURRENT_DATE, 
  'all', 'all', NULL, NULL, 100, 0
);
```

3. **Verifique estatísticas:**
```sql
ANALYZE saoluiz.produtos;
ANALYZE saoluiz.vendas;
ANALYZE saoluiz.vendas_hoje_itens;
```

### Erro 42P01 (missing FROM-clause)?

- Verifique que executou a migration 20260111_optimize_produtos_sem_vendas.sql
- A função antiga tinha `p.filial_id` antes do `FROM p.produtos`

### Paginação não aparece?

- Verifique que o total_count está sendo retornado pela API
- Check console do navegador para erros

## Próximos Passos

- [ ] Criar índices em todos os schemas
- [ ] Monitorar performance em produção
- [ ] Considerar materializar resultados frequentes
- [ ] Implementar cache Redis para queries repetidas
