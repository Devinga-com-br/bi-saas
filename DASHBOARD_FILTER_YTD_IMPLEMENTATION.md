# Dashboard Filter YTD Implementation - Final Summary

## Overview
Implementation of intelligent Year-to-Date (YTD) comparisons for dashboard cards based on filter type.

**KEY PRINCIPLE**: The dashboard **always shows BOTH comparisons** (PAM and PAA). The only adjustment is that the frontend limits dates to "today" when filtering by current month/year.

## Final Architecture

### Frontend Layer (DashboardFilter)
- When filter = **Month** and selected month is current: limits end date to today
- When filter = **Year** and selected year is current: limits end date to today
- When filter = **Custom**: uses user-selected dates
- Passes adjusted date range to dashboard page

### API Layer
- Receives date range from frontend
- No `filter_type` parameter needed
- Passes dates directly to RPC function

### Database Layer (RPC Function)
- **Always calculates BOTH comparisons**:
  - **PAM** (Período Anterior do Mês): subtracts 1 month from date range
  - **PAA** (Período Anterior do Ano): subtracts 1 year from date range
- Returns both in separate fields

### Display Layer (Dashboard Cards)
- Shows **TWO comparison rows** for each metric:
  1. Previous Month comparison (using `pa_*` fields)
  2. Previous Year comparison (using `variacao_*_ano` fields)

## Examples

### Scenario 1: Filter by Current Month
**User selects**: Mês = Novembro, Ano = 2025 (today: 16/11/2025)

**Frontend sends**: 01/11/2025 to 16/11/2025

**RPC calculates**:
- PAM: 01/10/2025 to 16/10/2025 (previous month)
- PAA: 01/11/2024 to 16/11/2024 (same period last year)

**Cards display**:
- Row 1: vs Mês Anterior → compares with 01/10/2025-16/10/2025
- Row 2: vs Ano Anterior → compares with 01/11/2024-16/11/2024

### Scenario 2: Filter by Current Year
**User selects**: Ano = 2025 (today: 16/11/2025)

**Frontend sends**: 01/01/2025 to 16/11/2025 (YTD)

**RPC calculates**:
- PAM: 01/12/2024 to 16/10/2025 (previous month - spans year boundary)
- PAA: 01/01/2024 to 16/11/2024 (YTD last year)

**Cards display**:
- Row 1: vs Mês Anterior → compares with 01/12/2024-16/10/2025
- Row 2: vs Ano Anterior → compares with 01/01/2024-16/11/2024 ✅ **YTD comparison**

### Scenario 3: Filter by Past Month
**User selects**: Mês = Outubro, Ano = 2025

**Frontend sends**: 01/10/2025 to 31/10/2025 (full month)

**RPC calculates**:
- PAM: 01/09/2025 to 30/09/2025 (previous month)
- PAA: 01/10/2024 to 31/10/2024 (same month last year)

**Cards display**:
- Row 1: vs Mês Anterior → compares with 01/09/2025-30/09/2025
- Row 2: vs Ano Anterior → compares with 01/10/2024-31/10/2024

## Files Changed

### ✅ 1. DashboardFilter Component
**File**: `src/components/dashboard/dashboard-filter.tsx`

**Changes**: Limits end date to today for current month/year

**Key Logic**:
```typescript
// When month filter changes
const isCurrentMonth = monthIndex === today.getMonth() && yearValue === today.getFullYear()
if (isCurrentMonth) {
  lastDay = today  // Limit to today for current month
}

// When year filter changes
const isCurrentYear = yearValue === today.getFullYear()
if (isCurrentYear) {
  lastDay = today  // Limit to today for current year (YTD)
}
```

### ✅ 2. Vendas por Filial API Route
**File**: `src/app/api/dashboard/vendas-por-filial/route.ts`

**Status**: Already updated with `filter_type` parameter (works correctly)

### ✅ 3. Vendas por Filial RPC Function
**File**: `supabase/migrations/20251116000000_update_vendas_por_filial_filter_type.sql`

**Status**: Applied - calculates period comparison based on filter type

### ✅ 4. Dashboard Data RPC Function
**File**: `supabase/migrations/20251116010000_fix_dashboard_data_filter_type.sql`

**Status**: Updated to revert to original logic (always returns both PAM and PAA)

**Key Logic**:
```sql
-- PAM: Always subtract 1 month
v_data_inicio_pa := (p_data_inicio - INTERVAL '1 month')::DATE;
v_data_fim_pa := (p_data_fim - INTERVAL '1 month')::DATE;

-- PAA: Always subtract 1 year
v_data_inicio_paa := (p_data_inicio - INTERVAL '1 year')::DATE;
v_data_fim_paa := (p_data_fim - INTERVAL '1 year')::DATE;

-- Always return BOTH
RETURN QUERY SELECT
  ...,
  v_pa_vendas,              -- PAM values
  ...,
  v_variacao_vendas_ano,    -- PAA variations
  ...
```

### ✅ 5. Dashboard API Route
**File**: `src/app/api/dashboard/route.ts`

**Status**: Reverted to original (no `filter_type` parameter)

## Migration Application

### Apply the Migration

**Via Supabase Dashboard** (Recommended):
1. Go to Supabase Dashboard → SQL Editor
2. Open `supabase/migrations/20251116010000_fix_dashboard_data_filter_type.sql`
3. Copy entire SQL content
4. Paste and run in SQL Editor
5. Verify success message

The migration will:
- Drop existing `get_dashboard_data` function (with or without `filter_type` parameter)
- Create new version with original signature (no `filter_type`)
- Restore logic that always calculates and returns both PAM and PAA

## Testing Checklist

After applying migration:

### ✅ Current Month Filter
- [ ] Select "Mês = Novembro 2025" (today: 16/11)
- [ ] Verify cards show TWO comparisons:
  - vs Mês Anterior (Oct 2024)
  - vs Ano Anterior (Nov 2024 - same period)

### ✅ Current Year Filter
- [ ] Select "Ano = 2025" (today: 16/11)
- [ ] Verify cards show TWO comparisons:
  - vs Mês Anterior (Dec 2024 - Oct 2025)
  - vs Ano Anterior (Jan 2024 - Nov 16 2024) ✅ **Should be YTD**

### ✅ Past Month Filter
- [ ] Select "Mês = Outubro 2025"
- [ ] Verify cards show full month comparisons (01-31)

### ✅ Past Year Filter
- [ ] Select "Ano = 2024"
- [ ] Verify cards show full year comparisons (Jan-Dec)

### ✅ Custom Date Range
- [ ] Select "01/11/2025 to 15/11/2025"
- [ ] Verify cards show same period comparisons

## Why This Solution Works

1. **Frontend controls date precision**: When user selects current month/year, frontend automatically limits to "today"

2. **Backend is date-agnostic**: RPC function simply subtracts intervals without knowing filter context

3. **Both comparisons always visible**: Users see month-over-month AND year-over-year trends simultaneously

4. **Automatic YTD for current periods**: Because frontend limits dates to today, the year subtraction naturally produces YTD comparisons

## Data Structure Reference

### RPC Function Returns
```typescript
{
  // Current period
  total_vendas: number,
  total_lucro: number,
  ticket_medio: number,
  margem_lucro: number,

  // PAM (Previous Month)
  pa_vendas: number,
  pa_lucro: number,
  pa_ticket_medio: number,
  pa_margem_lucro: number,

  // Month-over-month variations
  variacao_vendas_mes: number,
  variacao_lucro_mes: number,
  variacao_ticket_mes: number,
  variacao_margem_mes: number,

  // Year-over-year variations (PAA)
  variacao_vendas_ano: number,
  variacao_lucro_ano: number,
  variacao_ticket_ano: number,
  variacao_margem_ano: number,

  // YTD data
  ytd_vendas: number,
  ytd_vendas_ano_anterior: number,
  ytd_variacao_percent: number,

  grafico_vendas: JSON
}
```

## Completion Status

- ✅ Frontend: DashboardFilter limits dates to today for current periods
- ✅ Frontend: Dashboard page passes correct dates
- ✅ API: Dashboard route passes dates to RPC (no filter_type needed)
- ✅ Database: Vendas por Filial RPC uses filter_type correctly
- ⏳ **PENDING**: Apply Dashboard Data RPC migration
- ⏳ **PENDING**: Test all scenarios

---

**Created**: 2025-11-16
**Last Updated**: 2025-11-16
**Status**: Ready for migration application
**Impact**: Dashboard cards will show correct YTD comparisons for current periods
