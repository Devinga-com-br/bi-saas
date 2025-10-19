# 🔍 Query para Descobrir Estrutura da Tabela

Execute no SQL Editor do Supabase:

```sql
-- Ver todas as colunas da tabela despesas
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'okilao'
  AND table_name = 'despesas'
ORDER BY ordinal_position;
```

**Envie o resultado para eu corrigir o código!**

---

## Possíveis nomes da coluna:

- `tipodespesa_id`
- `tipo_id`
- `despesa_tipo_id`
- `id_tipo_despesa`
- `tipo` (apenas tipo, sem _id)

## Enquanto isso, teste ver algumas despesas:

```sql
-- Ver primeiras 5 despesas com todas as colunas
SELECT *
FROM okilao.despesas
LIMIT 5;
```

**Copie o resultado e envie para eu ver os nomes exatos das colunas!**
