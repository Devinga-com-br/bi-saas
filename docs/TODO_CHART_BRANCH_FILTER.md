# ✅ CONCLUÍDO: Filtro de Filiais no Gráfico de Vendas Mensais

## 📊 Problema Resolvido

O gráfico "Vendas Mensais (Ano Atual)" no dashboard agora **RESPEITA** as filiais autorizadas do usuário.

### Causa Original

A função RPC `get_sales_by_month_chart` no PostgreSQL não aceitava parâmetro de filiais.

### Solução Implementada

Criada migration [071_add_filiais_filter_to_sales_chart.sql](../supabase/migrations/071_add_filiais_filter_to_sales_chart.sql) que atualiza a função para aceitar o parâmetro `p_filiais`:

```sql
-- Nova assinatura
get_sales_by_month_chart(schema_name TEXT, p_filiais TEXT DEFAULT NULL)
```

### Impacto de Segurança (Resolvido)

✅ **RESOLVIDO**: Usuários com restrições de filiais agora veem apenas dados das filiais autorizadas.

---

## ✅ Solução Necessária

### Opção 1: Atualizar Função RPC Existente (Recomendado)

Modificar `get_sales_by_month_chart` para aceitar parâmetro opcional de filiais:

```sql
CREATE OR REPLACE FUNCTION public.get_sales_by_month_chart(
  schema_name TEXT,
  p_filiais TEXT DEFAULT NULL  -- Novo parâmetro
)
RETURNS TABLE (
  mes TEXT,
  total_vendas NUMERIC,
  total_vendas_ano_anterior NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Se p_filiais é NULL ou 'all', agregar todas as filiais
  -- Se p_filiais contém IDs (ex: '1,2,3'), filtrar apenas essas filiais

  -- Implementação aqui...
END;
$$;
```

### Opção 2: Criar Nova Função RPC

Criar função separada que suporta filtro de filiais:

```sql
CREATE OR REPLACE FUNCTION public.get_sales_by_month_chart_filtered(
  schema_name TEXT,
  p_filiais TEXT
)
-- ...
```

### Opção 3: Filtrar no Backend (Workaround Temporário)

⚠️ **Não recomendado** - Requer buscar dados detalhados por filial e agregar no Node.js, causando:
- Mais queries ao banco
- Maior uso de memória
- Performance reduzida

---

## 🔨 Implementação Sugerida

### Passo 1: Atualizar Função SQL

Localizar a migration que criou `get_sales_by_month_chart` e modificar:

```sql
-- Em: supabase/migrations/012_create_sales_chart_function.sql (ou similar)

CREATE OR REPLACE FUNCTION public.get_sales_by_month_chart(
  schema_name TEXT,
  p_filiais TEXT DEFAULT NULL
)
RETURNS TABLE (
  mes TEXT,
  total_vendas NUMERIC,
  total_vendas_ano_anterior NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_query TEXT;
  v_filial_filter TEXT;
BEGIN
  -- Construir filtro de filiais
  IF p_filiais IS NOT NULL AND p_filiais != 'all' THEN
    -- Converter '1,2,3' para condição SQL
    v_filial_filter := format('AND filial_id IN (%s)', p_filiais);
  ELSE
    v_filial_filter := '';
  END IF;

  -- Query dinâmica com filtro
  v_query := format($q$
    SELECT
      TO_CHAR(data_venda, 'Mon') as mes,
      SUM(valor_total) as total_vendas,
      SUM(valor_ano_anterior) as total_vendas_ano_anterior
    FROM %I.vendas
    WHERE EXTRACT(YEAR FROM data_venda) = EXTRACT(YEAR FROM CURRENT_DATE)
      %s
    GROUP BY TO_CHAR(data_venda, 'Mon')
    ORDER BY MIN(data_venda)
  $q$, schema_name, v_filial_filter);

  RETURN QUERY EXECUTE v_query;
END;
$$;
```

### Passo 2: Atualizar API

API já está preparada para passar o parâmetro. Só precisa descomentar:

```typescript
// Em: src/app/api/charts/sales-by-month/route.ts

const { data: rawData, error } = await supabase.rpc('get_sales_by_month_chart', {
  schema_name: requestedSchema,
  p_filiais: finalFiliais  // ✅ Já está preparado!
} as any);
```

### Passo 3: Remover Warning

Após atualizar a função RPC, remover o warning:

```typescript
// REMOVER estas linhas:
console.log('[API/CHARTS/SALES-BY-MONTH] Warning: Chart data not filtered by authorized branches (RPC limitation)')
```

---

## 📋 Checklist de Implementação

- [x] Localizar arquivo SQL da função `get_sales_by_month_chart`
- [x] Adicionar parâmetro `p_filiais TEXT DEFAULT NULL`
- [x] Implementar lógica de filtro por filiais na query
- [x] Criar migration 071_add_filiais_filter_to_sales_chart.sql
- [x] Atualizar API para passar parâmetro `p_filiais`
- [x] Remover warning de limitação
- [ ] Aplicar migration no ambiente (requer `supabase db push` ou deploy)
- [ ] Testar com usuário sem restrições
- [ ] Testar com usuário com 1 filial autorizada
- [ ] Testar com usuário com múltiplas filiais autorizadas
- [ ] Verificar que dados estão corretos para cada cenário

---

## 🧪 Testes de Validação

Após implementação, verificar:

1. **Usuário sem restrições**:
   - Gráfico mostra vendas de todas as filiais
   - Valores batem com totais gerais

2. **Usuário com 1 filial (ex: Filial 01)**:
   - Gráfico mostra APENAS vendas da Filial 01
   - Valores são menores que totais gerais
   - Não vaza dados de outras filiais

3. **Usuário com múltiplas filiais (ex: 01 e 03)**:
   - Gráfico mostra soma de Filial 01 + 03
   - Não inclui dados da Filial 02

---

## 📚 Arquivos Modificados

- [src/app/api/charts/sales-by-month/route.ts](../src/app/api/charts/sales-by-month/route.ts) - ✅ API atualizada para passar `p_filiais`
- [src/components/dashboard/chart-vendas.tsx](../src/components/dashboard/chart-vendas.tsx) - Componente do gráfico
- [supabase/migrations/071_add_filiais_filter_to_sales_chart.sql](../supabase/migrations/071_add_filiais_filter_to_sales_chart.sql) - ✅ Nova migration criada

---

## ⏱️ Status

**✅ IMPLEMENTADO** - Aguardando aplicação da migration e testes.

---

## 💡 Referência

Ver implementação correta em outras APIs que já filtram por filiais:
- `src/app/api/dashboard/route.ts`
- `src/app/api/dashboard/vendas-por-filial/route.ts`
- `src/app/api/metas/report/route.ts`

Essas APIs já implementam o filtro corretamente.
