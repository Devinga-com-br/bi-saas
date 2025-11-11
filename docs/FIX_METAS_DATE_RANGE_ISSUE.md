# Fix: Inconsistente Date Range in Metas Report (Single vs Multiple Branches)

## Issue Description

When filtering the "Metas Mensal" module:
- **Multiple branches**: Shows data from Nov 01, 2025 onwards (correct)
- **Single branch**: Does NOT show data from Nov 01, 2025 (incorrect)

### Logs Evidence

```
[API/METAS/REPORT] Calling RPC with params: {
  p_schema: 'okilao',
  p_mes: 11,
  p_ano: 2025,
  p_filial_id: null,
  p_filial_ids: [ 1, 4, 6, 7, 9 ]  // Multiple branches - works correctly
}

[API/METAS/REPORT] Calling RPC with params: {
  p_schema: 'okilao',
  p_mes: 11,
  p_ano: 2025,
  p_filial_id: null,
  p_filial_ids: [ 1 ]  // Single branch - date range issue
}
```

## Root Cause

The RPC function `get_metas_mensais_report` likely has **different code paths** for:
1. **Multiple branches** (array with multiple IDs): Calculates full date range correctly
2. **Single branch** (array with one ID): May be filtering by existing records instead of month range

## Expected Behavior

**Both scenarios should use the SAME date logic:**

```sql
v_data_inicio := MAKE_DATE(p_ano, p_mes, 1);  -- First day of month (e.g., 2025-11-01)
v_data_fim := (DATE_TRUNC('month', v_data_inicio) + INTERVAL '1 month - 1 day')::DATE; -- Last day of month
v_data_limite := CASE 
  WHEN CURRENT_DATE < v_data_fim THEN CURRENT_DATE - INTERVAL '1 day'
  ELSE v_data_fim
END;  -- D-1 (yesterday) or last day of month if in future
```

## Fix Required

The database function `get_metas_mensais_report` needs to be updated to ensure:

1. **Date Range Calculation** is CONSISTENT regardless of number of branches
2. **Start Date**: Always first day of selected month
3. **End Date**: D-1 (yesterday), but not exceeding month end
4. **No dependency on existing records**: Even if no metas exist for certain dates, show the full range

### SQL Function Update Needed

The function should have unified logic like:

```sql
CREATE OR REPLACE FUNCTION get_metas_mensais_report(
  p_schema text,
  p_mes integer,
  p_ano integer,
  p_filial_id integer DEFAULT NULL,
  p_filial_ids integer[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_data_inicio DATE;
  v_data_fim DATE;
  v_data_limite DATE;
  v_result jsonb;
BEGIN
  -- Calculate date range (SAME for ALL cases)
  v_data_inicio := MAKE_DATE(p_ano, p_mes, 1);
  v_data_fim := (DATE_TRUNC('month', v_data_inicio) + INTERVAL '1 month - 1 day')::DATE;
  
  -- Limit to D-1 (yesterday)
  v_data_limite := CASE 
    WHEN CURRENT_DATE <= v_data_fim THEN CURRENT_DATE - INTERVAL '1 day'
    ELSE v_data_fim
  END;
  
  -- Use SAME date filtering logic regardless of filial_ids length
  -- WHERE mm.data >= v_data_inicio AND mm.data <= v_data_limite
  -- AND (p_filial_ids IS NULL OR mm.filial_id = ANY(p_filial_ids))
  
  ...
END;
$$;
```

## Verification Steps

### 1. Test with Multiple Branches
```sql
SELECT get_metas_mensais_report(
  'okilao',
  11,  -- November
  2025,
  NULL,
  ARRAY[1, 4, 6, 7, 9]
);
```

Should return data from 2025-11-01 to 2025-11-10 (D-1 as of Nov 11)

### 2. Test with Single Branch
```sql
SELECT get_metas_mensais_report(
  'okilao',
  11,  -- November
  2025,
  NULL,
  ARRAY[1]
);
```

Should return SAME date range: 2025-11-01 to 2025-11-10

### 3. Test with All Branches
```sql
SELECT get_metas_mensais_report(
  'okilao',
  11,
  2025,
  NULL,
  NULL  -- All branches
);
```

Should return SAME date range: 2025-11-01 to 2025-11-10

## Impact

- **Module**: Metas / Mensal (`/metas`)
- **API**: `/api/metas/report`
- **Function**: `get_metas_mensais_report`
- **Severity**: Medium (data inconsistency, confuses users)

## Related Files

- `/src/app/api/metas/report/route.ts` - API route (frontend OK)
- `/src/app/(dashboard)/metas/mensal/page.tsx` - Frontend (OK)
- **DATABASE**: `get_metas_mensais_report` function - NEEDS FIX

## Action Required

1. **Database Admin**: Update the SQL function `get_metas_mensais_report`
2. **Ensure**: Same date logic for single and multiple branches
3. **Test**: All three scenarios above
4. **Verify**: Frontend shows consistent dates regardless of filter selection

---

**Created**: 2025-11-11  
**Status**: Pending Database Fix  
**Priority**: Medium
