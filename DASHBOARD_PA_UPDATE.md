# Atualização do Dashboard - Valores do Período Anterior (PA)

## Resumo da Mudança

Alteramos a visualização dos cards do dashboard para mostrar os valores absolutos do período anterior (PA) junto com a variação percentual, ao invés de apenas mostrar a porcentagem de variação.

## Mudanças Realizadas

### 1. Migration SQL (`020_dashboard_add_previous_values.sql`)

Atualizada a função `get_dashboard_data` para retornar também os valores absolutos do período anterior:

**Novos campos retornados:**
- `pa_vendas`: Valor total de vendas do período anterior
- `pa_lucro`: Valor total de lucro do período anterior
- `pa_ticket_medio`: Ticket médio do período anterior
- `pa_margem_lucro`: Margem de lucro do período anterior

### 2. Componente CardMetric

**Antes:**
- Mostrava apenas: "X% vs. mês anterior"

**Depois:**
- Mostra: "PA: R$ XXX,XX (+X.XX%)"
- Formato mais informativo com valor absoluto e percentual

### 3. Interface TypeScript

Atualizada a interface `DashboardData` para incluir os novos campos:

```typescript
interface DashboardData {
  // ... campos existentes
  pa_vendas: number
  pa_lucro: number
  pa_ticket_medio: number
  pa_margem_lucro: number
  // ...
}
```

## Como Aplicar a Migration

### Opção 1: Via Supabase CLI
```bash
npx supabase db push
```

### Opção 2: Via SQL Editor do Supabase
Copie e execute o conteúdo do arquivo `supabase/migrations/020_dashboard_add_previous_values.sql` no SQL Editor do Supabase.

### Opção 3: Via psql
```bash
psql [connection_string] -f supabase/migrations/020_dashboard_add_previous_values.sql
```

## Resultado Visual

Os cards agora mostram:

```
Total de Vendas
R$ 150.000,00
↑ PA: R$ 120.000,00 (+25.00%)
```

Ao posicionar o mouse, aparece um tooltip com a comparação do ano anterior.

## Benefícios

1. **Mais Contexto**: Usuário vê o valor absoluto do período comparado
2. **Flexibilidade**: Funciona com qualquer período selecionado, não apenas mês
3. **Clareza**: Fica claro quanto foi o crescimento em reais e em percentual
