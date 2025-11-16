# Dashboard Filter - Reversão Completa

## Mudanças Revertidas

### 1. DashboardFilter Component ✅
**Arquivo**: `src/components/dashboard/dashboard-filter.tsx`

**O que foi revertido**:
- Removidas todas as verificações `isCurrentMonth` e `isCurrentYear`
- Agora sempre retorna período completo do mês/ano selecionado
- Não limita mais a data final a "hoje"

**Antes** (limitava ao dia atual):
```typescript
const today = new Date()
const isCurrentMonth = monthIndex === today.getMonth() && yearValue === today.getFullYear()
if (isCurrentMonth) {
  lastDay = today  // Limitava a hoje
}
```

**Depois** (sempre retorna período completo):
```typescript
const firstDay = startOfMonth(new Date(yearValue, monthIndex))
const lastDay = endOfMonth(new Date(yearValue, monthIndex))
onPeriodChange(firstDay, lastDay, 'month')
```

### 2. Dashboard API Route ✅
**Arquivo**: `src/app/api/dashboard/route.ts`

**O que foi revertido**:
- Removido parâmetro `filter_type` do schema de validação
- Removido da extração de parâmetros
- Removido do objeto de chamada RPC

**Antes**:
```typescript
filter_type: z.enum(['month', 'year', 'custom']).optional().default('month')
...
p_filter_type: filter_type
```

**Depois**:
```typescript
// Parâmetro filter_type removido completamente
```

### 3. Dashboard Data RPC Function ✅
**Arquivo**: `supabase/migrations/20251116010000_fix_dashboard_data_filter_type.sql`

**O que foi revertido**:
- Removido parâmetro `p_filter_type` da assinatura
- Removida lógica condicional que escolhia entre PAM e PAA
- Volta a sempre calcular e retornar AMBOS (PAM e PAA)

**Antes**:
```sql
IF p_filter_type = 'year' THEN
  v_final_pa_vendas := v_paa_vendas;  -- Escolhe PAA
ELSE
  v_final_pa_vendas := v_pa_vendas;   -- Escolhe PAM
END IF;
```

**Depois**:
```sql
-- Sempre retorna PAM nos campos pa_*
RETURN QUERY SELECT
  ...,
  v_pa_vendas,              -- Sempre PAM
  ...,
  v_variacao_vendas_ano,    -- Sempre PAA
  ...
```

## Comportamento Final

### Filtro por Mês (incluindo mês atual)
**Seleção**: Mês = Novembro, Ano = 2025 (hoje: 16/11/2025)

**Frontend envia**: 01/11/2025 a 30/11/2025 (período completo do mês)

**RPC calcula**:
- PAM: 01/10/2025 a 31/10/2025 (mês anterior completo)
- PAA: 01/11/2024 a 30/11/2024 (mesmo mês ano anterior completo)

**Cards exibem**:
- Comparação vs Mês Anterior (PAM)
- Comparação vs Ano Anterior (PAA)

### Filtro por Ano (incluindo ano atual)
**Seleção**: Ano = 2025 (hoje: 16/11/2025)

**Frontend envia**: 01/01/2025 a 31/12/2025 (ano completo)

**RPC calcula**:
- PAM: 01/12/2024 a 31/11/2025 (mês anterior ao período)
- PAA: 01/01/2024 a 31/12/2024 (ano anterior completo)

**Cards exibem**:
- Comparação vs Mês Anterior (PAM)
- Comparação vs Ano Anterior (PAA)

### Filtro Customizado
**Seleção**: 01/11/2025 a 15/11/2025

**Frontend envia**: 01/11/2025 a 15/11/2025

**RPC calcula**:
- PAM: 01/10/2025 a 15/10/2025 (subtraindo 1 mês)
- PAA: 01/11/2024 a 15/11/2024 (subtraindo 1 ano)

**Cards exibem**:
- Comparação vs Mês Anterior (PAM)
- Comparação vs Ano Anterior (PAA)

## Arquivos Modificados

1. ✅ `src/components/dashboard/dashboard-filter.tsx`
   - Removidas verificações de mês/ano atual
   - Sempre retorna período completo

2. ✅ `src/app/api/dashboard/route.ts`
   - Removido parâmetro `filter_type`

3. ✅ `supabase/migrations/20251116010000_fix_dashboard_data_filter_type.sql`
   - Função revertida para lógica original
   - Sempre retorna PAM e PAA

## Status

- ✅ Frontend revertido
- ✅ API revertida
- ✅ Migration criada (aplicada pelo usuário)
- ✅ Comportamento restaurado ao original

## Nota Importante

A lógica agora está **exatamente como era antes** de todas as mudanças. O dashboard sempre:
1. Mostra períodos completos (mês/ano inteiro)
2. Calcula PAM (mês anterior)
3. Calcula PAA (ano anterior)
4. Exibe ambas as comparações nos cards

Não há mais lógica condicional baseada no tipo de filtro ou limitação ao dia atual.

---

**Data**: 2025-11-16
**Status**: Reversão completa aplicada
**Resultado**: Dashboard volta ao comportamento original
