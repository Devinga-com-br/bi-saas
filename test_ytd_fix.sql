-- =====================================================
-- Test Script: YTD Fix Verification
-- Purpose: Verify that YTD calculations are correct for both current and past years
-- =====================================================

-- Test 1: Filter by current year (2025)
-- Expected: YTD should calculate from 01/01/2025 to 15/11/2025 (current date)
--           YTD ano anterior should be 01/01/2024 to 15/11/2024
SELECT 
  'TEST 1: Ano 2025 (Ano Atual)' as test_case,
  ytd_lucro,
  ytd_lucro_ano_anterior,
  ytd_variacao_lucro_percent,
  ytd_margem,
  ytd_margem_ano_anterior,
  ytd_variacao_margem
FROM public.get_dashboard_ytd_metrics(
  'saoluiz',
  '2025-01-01'::DATE,
  '2025-12-31'::DATE,
  NULL
);

-- Test 2: Filter by past year (2024)
-- Expected: YTD should calculate from 01/01/2024 to 31/12/2024 (full year)
--           YTD ano anterior should be 01/01/2023 to 31/12/2023
SELECT 
  'TEST 2: Ano 2024 (Ano Passado)' as test_case,
  ytd_lucro,
  ytd_lucro_ano_anterior,
  ytd_variacao_lucro_percent,
  ytd_margem,
  ytd_margem_ano_anterior,
  ytd_variacao_margem
FROM public.get_dashboard_ytd_metrics(
  'saoluiz',
  '2024-01-01'::DATE,
  '2024-12-31'::DATE,
  NULL
);

-- Test 3: Compare with get_dashboard_data for verification
-- When filtering year 2025, the "2024 YTD" from YTD metrics should be different from "2024" (full year)
SELECT 
  'TEST 3: Comparação Dashboard Data vs YTD Metrics' as test_case,
  pa_vendas as dashboard_2024_full_year,
  pa_lucro as dashboard_lucro_2024_full_year,
  pa_margem_lucro as dashboard_margem_2024_full_year
FROM public.get_dashboard_data(
  'saoluiz',
  '2025-01-01'::DATE,
  '2025-12-31'::DATE,
  NULL
);

-- Expected Results:
-- TEST 1: YTD values should reflect Jan-Nov 2025 vs Jan-Nov 2024
-- TEST 2: YTD values should reflect full year 2024 vs full year 2023
-- TEST 3: Values from pa_* should be DIFFERENT from ytd_* in TEST 1
--         because pa_* shows FULL YEAR 2024 while ytd_* shows YTD 2024

-- =====================================================
-- Validation Queries
-- =====================================================

-- Manual calculation for TEST 1 verification
-- YTD 2024: 01/01/2024 to 15/11/2024
SELECT 
  'VALIDATION: Cálculo Manual YTD 2024 (01/01/2024 a 15/11/2024)' as check_name,
  COALESCE(SUM(valor_total), 0) as receita_ytd_2024,
  COALESCE(SUM(total_lucro), 0) as lucro_ytd_2024,
  CASE 
    WHEN SUM(valor_total) > 0 
    THEN (SUM(total_lucro) / SUM(valor_total)) * 100 
    ELSE 0 
  END as margem_ytd_2024
FROM saoluiz.vendas_diarias_por_filial
WHERE data_venda BETWEEN '2024-01-01' AND '2024-11-15';

-- Manual calculation for full year 2024
SELECT 
  'VALIDATION: Cálculo Manual Ano Completo 2024 (01/01/2024 a 31/12/2024)' as check_name,
  COALESCE(SUM(valor_total), 0) as receita_2024_completo,
  COALESCE(SUM(total_lucro), 0) as lucro_2024_completo,
  CASE 
    WHEN SUM(valor_total) > 0 
    THEN (SUM(total_lucro) / SUM(valor_total)) * 100 
    ELSE 0 
  END as margem_2024_completo
FROM saoluiz.vendas_diarias_por_filial
WHERE data_venda BETWEEN '2024-01-01' AND '2024-12-31';

-- These two values should be DIFFERENT:
-- - YTD 2024 (Jan-Nov): should match ytd_lucro_ano_anterior from TEST 1
-- - Full 2024 (Jan-Dec): should match pa_lucro from TEST 3
