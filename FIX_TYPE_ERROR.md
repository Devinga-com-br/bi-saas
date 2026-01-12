# 🔧 FIX - Erro de Tipo SQL

**Erro:** `operator does not exist: date <= integer`

## Problema

Na versão anterior do WHERE, tínhamos:
```sql
WHERE (
  (uv.data_ultima_venda IS NULL AND $1 <= 9999)  -- ❌ ERRO!
  OR
  (uv.data_ultima_venda >= $1 AND uv.data_ultima_venda <= $2)
)
```

**Erro:** `$1` é uma DATE, mas `9999` é um INTEGER. PostgreSQL não pode comparar date <= integer.

## Solução

```sql
WHERE (
  uv.data_ultima_venda IS NULL  -- ✅ Sempre incluir produtos que nunca venderam
  OR
  (uv.data_ultima_venda >= $1 AND uv.data_ultima_venda <= $2)
)
```

**Lógica corrigida:**
1. Se produto NUNCA vendeu (IS NULL) → sempre inclui
2. Se produto tem última venda → verifica se está no range de datas

## Comportamento

### Produtos que NUNCA venderam
- `data_ultima_venda = NULL`
- `dias_sem_venda = 9999`
- **Sempre aparecem** no resultado (independente do range)
- Isso está correto! Produto sem histórico de venda é crítico.

### Produtos com vendas antigas
- `data_ultima_venda` entre `data_limite_min` e `data_limite_max`
- `dias_sem_venda` calculado normalmente
- Aparecem se estiverem no range especificado

## Deploy

**Arquivo atualizado:** `DEPLOY_FUNCTION_RANGE.sql`

Execute novamente no Supabase SQL Editor.

## Teste

Após executar:
1. Recarregue a página
2. Defina: Min=15, Max=90
3. Clique "Buscar"
4. Deve funcionar sem erros!
