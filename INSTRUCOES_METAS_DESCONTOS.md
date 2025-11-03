# Instruções para Aplicar Descontos nas Metas Mensais

## APIs Atualizadas ✅

As seguintes APIs já foram atualizadas para usar client direto (sem cache):

1. **[src/app/api/metas/report/route.ts](src/app/api/metas/report/route.ts)** - Relatório de metas
2. **[src/app/api/metas/generate/route.ts](src/app/api/metas/generate/route.ts)** - Geração de metas

## Próximos Passos - Funções PostgreSQL

As funções PostgreSQL que precisam ser atualizadas são:

### 1. `get_metas_mensais_report`
Esta função busca o realizado diário e precisa subtrair os descontos.

### 2. `generate_metas_mensais`
Esta função gera as metas baseadas em dados históricos e também precisa considerar os descontos.

## Como Obter as Definições das Funções

Execute este SQL no Supabase SQL Editor para ver as funções atuais:

```sql
-- Ver definição de get_metas_mensais_report
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'get_metas_mensais_report';

-- Ver definição de generate_metas_mensais
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'generate_metas_mensais';
```

## Lógica de Desconto a Aplicar

Onde a função buscar vendas de `vendas_diarias_por_filial`, deve também:

1. Buscar descontos da tabela `descontos_venda` para o mesmo período e filial
2. Subtrair os descontos do valor de vendas:
   ```sql
   valor_realizado = SUM(valor_total) - COALESCE(SUM(valor_desconto), 0)
   ```

## Exemplo de Padrão

```sql
-- CTE para vendas
vendas AS (
  SELECT
    data_venda,
    SUM(valor_total) as total_vendas
  FROM schema.vendas_diarias_por_filial
  WHERE ...
  GROUP BY data_venda
),
-- CTE para descontos
descontos AS (
  SELECT
    data_desconto,
    SUM(valor_desconto) as total_descontos
  FROM schema.descontos_venda
  WHERE ...
  GROUP BY data_desconto
)
-- Join e subtrair
SELECT
  v.data_venda,
  v.total_vendas - COALESCE(d.total_descontos, 0) as valor_liquido
FROM vendas v
LEFT JOIN descontos d ON v.data_venda = d.data_desconto
```

**Envie as definições das funções** para que eu possa criar os scripts SQL de atualização.
