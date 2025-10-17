-- Test script for get_vendas_diarias_com_metas function
-- This file is for testing purposes only and should not be run in production

-- Test 1: Call function with valid parameters
-- Replace 'your_tenant_schema' and date as needed
SELECT get_vendas_diarias_com_metas('your_tenant_schema', CURRENT_DATE);

-- Test 2: Call function with a specific past date
SELECT get_vendas_diarias_com_metas('your_tenant_schema', '2025-10-15');

-- Test 3: Format output for better readability
SELECT jsonb_pretty(
  get_vendas_diarias_com_metas('your_tenant_schema', CURRENT_DATE)
);

-- Test 4: Check specific fields from the result
WITH result AS (
  SELECT get_vendas_diarias_com_metas('your_tenant_schema', CURRENT_DATE) as data
)
SELECT 
  jsonb_array_length(data) as total_filiais,
  data->0->>'filial_codigo' as primeira_filial,
  data->0->'vendas'->>'valor_total' as valor_primeira_filial
FROM result;

-- Test 5: Verify data structure
WITH result AS (
  SELECT jsonb_array_elements(
    get_vendas_diarias_com_metas('your_tenant_schema', CURRENT_DATE)
  ) as item
)
SELECT 
  item->>'filial_id' as filial_id,
  item->>'filial_codigo' as filial_codigo,
  item->'vendas'->>'valor_total' as valor_total,
  item->'meta'->>'valor_meta' as meta,
  item->'meta'->>'percentual_atingimento' as percentual,
  item->'meta'->>'status' as status
FROM result;
