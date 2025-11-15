# Fix YTD Revenue Calculation - Apply Now

## Problem
The YTD metrics function was calculating revenue YTD internally but not returning it. This caused the Dashboard to use incorrect data for the "2024 YTD" comparison in the Receita Bruta card.

## Solution
Updated the `get_dashboard_ytd_metrics` function to return revenue YTD values:
- `ytd_vendas` - Current year revenue YTD
- `ytd_vendas_ano_anterior` - Previous year revenue YTD  
- `ytd_variacao_vendas_percent` - Revenue YTD variation %

## How to Apply

### Step 1: Apply SQL Migration

Go to Supabase Dashboard → SQL Editor and run the migration file:

```
supabase/migrations/20251115160000_add_revenue_to_ytd_function.sql
```

Or copy and paste the SQL directly from that file into the SQL Editor.

### Step 2: Verify Changes

The following files were updated:
- ✅ `supabase/migrations/20251115160000_add_revenue_to_ytd_function.sql` - New migration
- ✅ `src/app/(dashboard)/dashboard/page.tsx` - Updated YTDMetrics interface and Receita Bruta card

### Step 3: Test

1. Restart the dev server if running
2. Access the Dashboard
3. Filter by "Ano" (year) - should be 2025
4. Check the "Receita Bruta" card
5. The "2024 YTD" value should now show the correct year-to-date comparison

Example:
```
Receita Bruta
R$ 217.962.983,06

2024 YTD: R$ 206.395.292,53 (+5.60%)
2024: R$ 238.064.366,16 (-8.44%)
```

## What Changed

### Before
- Revenue YTD was calculated but not returned
- Dashboard used wrong data source for YTD revenue
- Only Lucro and Margem had correct YTD values

### After  
- Revenue YTD is now returned by the function
- Dashboard uses `ytdData.ytd_vendas_ano_anterior` for correct YTD comparison
- All three metrics (Receita, Lucro, Margem) have consistent YTD calculations

## Technical Details

The function now returns 9 fields instead of 6:
1. ytd_vendas (NEW)
2. ytd_vendas_ano_anterior (NEW)
3. ytd_variacao_vendas_percent (NEW)
4. ytd_lucro
5. ytd_lucro_ano_anterior
6. ytd_variacao_lucro_percent
7. ytd_margem
8. ytd_margem_ano_anterior
9. ytd_variacao_margem

All calculations include discount subtraction when `descontos_venda` table exists.
